create table people (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null check(length(trim(name))>0),
 role text not null, weekly_hours numeric(6,2) not null check(weekly_hours between 0 and 168),
 hourly_cents bigint not null check(hourly_cents between 0 and 10000000), currency text not null check(currency in ('NZD','AUD','USD','CAD','GBP','EUR')),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table requests (
 id uuid primary key default gen_random_uuid(), code text unique not null, title text not null check(length(trim(title))>0),
 business_unit text not null default '', owner_id uuid references people, purpose text not null default '',
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 status text not null default 'in_review' check(status in ('in_review','approved','waitlisted','declined','completed','cancelled')),
 submitted_on date not null default current_date, needed_on date, review_on date,
 safety_related boolean not null default false, risk_brief text not null default '', worker_input text not null default '', delivery_method text not null default '',
 decision text not null default '', source_status text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(needed_on is null or needed_on>=submitted_on)
);
create table projects (
 id uuid primary key default gen_random_uuid(), code text unique not null, title text not null check(length(trim(title))>0),
 request_id uuid not null references requests, owner_id uuid not null references people,
 status text not null default 'planned' check(status in ('planned','active','completed','cancelled')),
 start_on date not null, due_on date not null check(due_on>=start_on),
 budget_cents bigint not null check(budget_cents between 0 and 1000000000000), currency text not null check(currency in ('NZD','AUD','USD','CAD','GBP','EUR')),
 measure text not null check(length(trim(measure))>0), baseline numeric(14,4) not null, target numeric(14,4) not null,
 measure_unit text not null, direction text not null check(direction in ('increase','decrease')),
 evaluation_on date not null check(evaluation_on>=due_on), completed_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='completed')=(completed_on is not null))
);
create table allocations (
 id uuid primary key default gen_random_uuid(), code text unique not null, project_id uuid not null references projects,
 person_id uuid not null references people, week_on date not null check(extract(isodow from week_on)=1),
 hours numeric(6,2) not null check(hours>0 and hours<=168), rate_cents bigint not null check(rate_cents between 0 and 10000000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,person_id,week_on)
);
create table time_entries (
 id uuid primary key default gen_random_uuid(), code text unique not null, project_id uuid not null references projects,
 person_id uuid not null references people, worked_on date not null, hours numeric(5,2) not null check(hours>0 and hours<=24),
 rate_cents bigint not null check(rate_cents between 0 and 10000000), note text not null check(length(trim(note))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table costs (
 id uuid primary key default gen_random_uuid(), code text unique not null, project_id uuid not null references projects,
 title text not null, amount_cents bigint not null check(amount_cents between 0 and 1000000000000),
 status text not null default 'committed' check(status in ('committed','paid','cancelled')), evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table milestones (
 id uuid primary key default gen_random_uuid(), code text unique not null, title text not null, project_id uuid not null references projects,
 due_on date not null, status text not null default 'open' check(status in ('open','done')), evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(status<>'done' or length(trim(evidence))>0)
);
create table outcomes (
 id uuid primary key default gen_random_uuid(), code text unique not null, project_id uuid not null unique references projects,
 measured_on date not null, actual numeric(14,4) not null, evidence text not null check(length(trim(evidence))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), code text unique not null, request_id uuid not null references requests,
 body text not null check(length(trim(body))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table import_batches (
 id uuid primary key default gen_random_uuid(), workspace text not null, file_hash text not null, row_count integer not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table source_requests (
 id uuid primary key default gen_random_uuid(), workspace text not null, source_key text not null, request_id uuid not null references requests,
 raw jsonb not null, batch_id uuid not null references import_batches,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace,source_key)
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null, action text not null, actor text not null,
 before_row jsonb, after_row jsonb, created_at timestamptz not null default now()
);
create function record_change() returns trigger language plpgsql as $$
begin
 if coalesce(nullif(current_setting('app.actor',true),''),'')='' then raise exception 'Actor label required'; end if;
 if TG_OP='UPDATE' then NEW.updated_at=now(); end if;
 insert into audit_log(entity,record_id,action,actor,before_row,after_row)
 values(TG_TABLE_NAME,NEW.id,TG_OP,current_setting('app.actor',true),case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,to_jsonb(NEW));
 return NEW;
end $$;
create function protect_history() returns trigger language plpgsql as $$ begin raise exception 'Append-only record; corrections need a reviewed migration'; end $$;
create trigger audit_immutable before update or delete on audit_log for each row execute function protect_history();
create trigger outcomes_immutable before update or delete on outcomes for each row execute function protect_history();
create trigger time_immutable before update or delete on time_entries for each row execute function protect_history();
create trigger notes_immutable before update or delete on notes for each row execute function protect_history();
create function request_guard() returns trigger language plpgsql as $$
begin
 if NEW.status='approved' then
  if NEW.owner_id is null or trim(NEW.purpose)='' or NEW.review_on is null then raise exception 'Approval needs an owner, purpose and retention review date'; end if;
  if not exists(select 1 from people where id=NEW.owner_id and active) then raise exception 'Active request owner required'; end if;
  if NEW.safety_related and (trim(NEW.risk_brief)='' or trim(NEW.worker_input)='' or trim(NEW.delivery_method)='') then raise exception 'Safety request needs risk, worker input and delivery method evidence'; end if;
 end if;
 if TG_OP='UPDATE' and OLD.status<>NEW.status and trim(NEW.decision)='' then raise exception 'Decision reason required'; end if;
 if NEW.status in ('declined','cancelled','waitlisted','in_review') and exists(select 1 from projects where request_id=NEW.id and status in ('planned','active')) then raise exception 'Resolve open projects before changing request decision'; end if;
 if NEW.status='completed' and (not exists(select 1 from projects where request_id=NEW.id) or exists(select 1 from projects where request_id=NEW.id and status not in ('completed','cancelled'))) then raise exception 'Request still has unfinished projects or no project'; end if;
 return NEW;
end $$;
create trigger request_rules before insert or update on requests for each row execute function request_guard();
create function project_guard() returns trigger language plpgsql as $$
begin
 if not exists(select 1 from requests where id=NEW.request_id and status='approved') and NEW.status in ('planned','active') then raise exception 'Approve request before planning a project'; end if;
 if not exists(select 1 from people where id=NEW.owner_id and active) then raise exception 'Active project owner required'; end if;
 if TG_OP='UPDATE' and OLD.status in ('completed','cancelled') then raise exception 'Closed projects cannot be changed'; end if;
 if TG_OP='UPDATE' and (OLD.currency<>NEW.currency or OLD.request_id<>NEW.request_id) then raise exception 'Project currency and request are fixed'; end if;
 if NEW.status='completed' then
  if not exists(select 1 from milestones where project_id=NEW.id) or exists(select 1 from milestones where project_id=NEW.id and status<>'done') then raise exception 'Complete evidenced milestones before completing project'; end if;
 end if;
 return NEW;
end $$;
create trigger project_rules before insert or update on projects for each row execute function project_guard();
create function work_guard() returns trigger language plpgsql as $$
declare p projects%rowtype; person people%rowtype; used numeric;
begin
 select * into p from projects where id=NEW.project_id for update;
 if not found then raise exception 'Project not found'; end if;
 if p.status in ('completed','cancelled') then
  if TG_TABLE_NAME='costs' and TG_OP='UPDATE' and p.status='completed' then
   if OLD.status<>'committed' or NEW.status<>'paid' or NEW.project_id<>OLD.project_id or NEW.amount_cents<>OLD.amount_cents or NEW.title<>OLD.title then raise exception 'Completed project permits only settlement of its existing commitment'; end if;
  else raise exception 'Closed project cannot receive work records'; end if;
 end if;
 if TG_TABLE_NAME in ('allocations','time_entries') then
  select * into person from people where id=NEW.person_id for update;
  if not found or not person.active then raise exception 'Active person required'; end if;
  if person.currency<>p.currency then raise exception 'Currency mismatch'; end if;
  if TG_OP='INSERT' then NEW.rate_cents=person.hourly_cents; end if;
  if TG_TABLE_NAME='allocations' then
   if NEW.week_on>p.due_on or NEW.week_on+6<p.start_on then raise exception 'Allocation week outside project dates'; end if;
   select coalesce(sum(a.hours),0) into used from allocations a join projects q on q.id=a.project_id where a.person_id=NEW.person_id and a.week_on=NEW.week_on and a.id<>NEW.id and q.status in ('planned','active');
   if used+NEW.hours>person.weekly_hours then raise exception 'Allocation exceeds weekly capacity'; end if;
  else
   if NEW.worked_on>current_date or NEW.worked_on<p.start_on then raise exception 'Work date is future or before project'; end if;
   select coalesce(sum(hours),0) into used from time_entries where person_id=NEW.person_id and worked_on=NEW.worked_on and id<>NEW.id;
   if used+NEW.hours>24 then raise exception 'Daily hours exceed 24'; end if;
  end if;
 end if;
 return NEW;
end $$;
create trigger allocation_rules before insert or update on allocations for each row execute function work_guard();
create trigger time_rules before insert on time_entries for each row execute function work_guard();
create trigger cost_rules before insert or update on costs for each row execute function work_guard();
create trigger milestone_rules before insert or update on milestones for each row execute function work_guard();
create function outcome_guard() returns trigger language plpgsql as $$
declare p projects%rowtype;
begin
 select * into p from projects where id=NEW.project_id for update;
 if p.status<>'completed' or NEW.measured_on<p.completed_on or NEW.measured_on>current_date then raise exception 'Outcome needs a completed project and a valid observed date'; end if;
 return NEW;
end $$;
create trigger outcome_rules before insert on outcomes for each row execute function outcome_guard();
do $$ declare t text; begin
 foreach t in array array['people','requests','projects','allocations','time_entries','costs','milestones','outcomes','notes','import_batches','source_requests'] loop
 execute format('create trigger z_record_change before insert or update on %I for each row execute function record_change()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 execute format('create trigger no_delete before delete on %I for each row execute function protect_history()',t);
 end loop;
end $$;
alter table audit_log enable row level security;
revoke all on audit_log from public;
create view v_intake with(security_invoker=true) as
 select r.code,r.title,r.business_unit,coalesce(p.name,'Unassigned') owner,r.priority,r.status,r.needed_on,
 current_date-r.submitted_on waiting_days,r.safety_related from requests r left join people p on p.id=r.owner_id;
create view v_capacity with(security_invoker=true) as
 select p.code,p.name,p.role,w.week_on,p.weekly_hours,coalesce(sum(a.hours) filter(where j.status in ('planned','active')),0) planned_hours,
 p.weekly_hours-coalesce(sum(a.hours) filter(where j.status in ('planned','active')),0) available_hours
 from people p cross join (select (date_trunc('week',current_date)::date + i*7) week_on from generate_series(0,3) i) w
 left join allocations a on a.person_id=p.id and a.week_on=w.week_on left join projects j on j.id=a.project_id
 where p.active group by p.id,w.week_on;
create view v_budgets with(security_invoker=true) as
 select p.code,p.title,p.status,p.currency,p.budget_cents,
 coalesce(a.planned_cents,0)::bigint planned_labour_cents,coalesce(t.actual_cents,0)::bigint actual_labour_cents,
 coalesce(c.paid_cents,0)::bigint paid_external_cents,coalesce(c.committed_cents,0)::bigint committed_external_cents,
 (greatest(coalesce(a.planned_cents,0),coalesce(t.actual_cents,0))+coalesce(c.paid_cents,0)+coalesce(c.committed_cents,0))::bigint forecast_cents,
 (p.budget_cents-greatest(coalesce(a.planned_cents,0),coalesce(t.actual_cents,0))-coalesce(c.paid_cents,0)-coalesce(c.committed_cents,0))::bigint headroom_cents
 from projects p
 left join (select project_id,sum(round(hours*rate_cents)) planned_cents from allocations group by project_id) a on a.project_id=p.id
 left join (select project_id,sum(round(hours*rate_cents)) actual_cents from time_entries group by project_id) t on t.project_id=p.id
 left join (select project_id,sum(amount_cents) filter(where status='paid') paid_cents,sum(amount_cents) filter(where status='committed') committed_cents from costs group by project_id) c on c.project_id=p.id;
create view v_evaluations with(security_invoker=true) as
 select p.code,p.title,p.status,p.measure,p.baseline,p.target,p.measure_unit,p.direction,p.evaluation_on,o.measured_on,o.actual,o.evidence,
 case when o.actual is null then 'not_measured' when (p.direction='increase' and o.actual>=p.target) or(p.direction='decrease' and o.actual<=p.target) then 'target_met' else 'below_target' end result
 from projects p left join outcomes o on o.project_id=p.id;
create view v_compliance with(security_invoker=true) as
 select code,'PURPOSE' rule,'Record the operational purpose' finding from requests where trim(purpose)=''
 union all select code,'RETENTION_REVIEW','Set or revisit the retention review date; no automatic deletion' from requests where review_on is null or review_on<=current_date
 union all select code,'SAFETY_BRIEF','Document risks, worker input and understandable delivery before approval' from requests where safety_related and (trim(risk_brief)='' or trim(worker_input)='' or trim(delivery_method)='')
 union all select code,'OWNER','Assign an active owner' from requests where owner_id is null or not exists(select 1 from people where id=owner_id and active);
create view v_attention with(security_invoker=true) as
 select code,title,'intake decision' reason,needed_on due_on from requests where status in ('in_review','waitlisted') and (needed_on<current_date or submitted_on<current_date-14)
 union all select m.code,m.title,'overdue milestone',m.due_on from milestones m join projects p on p.id=m.project_id where m.status='open' and m.due_on<current_date and p.status in ('planned','active')
 union all select code,title,'budget forecast exceeds limit',null::date from v_budgets where headroom_cents<0 and status<>'cancelled'
 union all select code,title,'outcome review overdue',evaluation_on from v_evaluations where status='completed' and actual is null and evaluation_on<current_date;
