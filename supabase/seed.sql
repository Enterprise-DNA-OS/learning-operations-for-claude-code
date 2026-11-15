do $$
declare mon date:=date_trunc('week',current_date)::date;
begin
 if exists(select 1 from people where code='P-1') then return; end if;
 if exists(select 1 from people) or exists(select 1 from requests) then raise exception 'Seed requires an empty demo database'; end if;
 perform set_config('app.actor','fictional-demo',true);
 insert into people(id,code,name,role,weekly_hours,hourly_cents,currency) values
 ('10000000-0000-0000-0000-000000000001','P-1','Alex Morgan','Learning designer',32,8500,'NZD'),
 ('10000000-0000-0000-0000-000000000002','P-2','Alex Chen','Learning designer',24,9000,'NZD'),
 ('10000000-0000-0000-0000-000000000003','P-3','Mere Wilson','Programme lead',30,11000,'NZD');
 insert into requests(id,code,title,business_unit,owner_id,purpose,status,submitted_on,needed_on,review_on,priority,safety_related,risk_brief,worker_input,delivery_method) values
 ('20000000-0000-0000-0000-000000000001','R-101','Warehouse induction refresh','Distribution','10000000-0000-0000-0000-000000000003','Reduce induction handover gaps','approved',current_date-45,current_date+14,current_date+180,'high',true,'Separate pedestrians from moving equipment','Shift representatives reviewed the brief','Demonstration with visual instructions'),
 ('20000000-0000-0000-0000-000000000002','R-102','Service complaints workshop','Service','10000000-0000-0000-0000-000000000003','Improve response accuracy','approved',current_date-90,current_date-30,current_date+90,'medium',false,'','',''),
 ('20000000-0000-0000-0000-000000000003','R-103','Chemical handling refresher','Distribution',null,'','in_review',current_date-25,current_date-3,null,'high',true,'','',''),
 ('20000000-0000-0000-0000-000000000004','R-104','New supervisor briefing','People','10000000-0000-0000-0000-000000000003','Explain escalation responsibilities','waitlisted',current_date-20,current_date+21,current_date-2,'low',false,'','','');
 insert into projects(id,code,title,request_id,owner_id,start_on,due_on,budget_cents,currency,measure,baseline,target,measure_unit,direction,evaluation_on) values
 ('30000000-0000-0000-0000-000000000001','J-101','Warehouse induction pack','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',current_date-21,current_date+14,200000,'NZD','Observed handover gaps',12,3,'gaps per weekly sample','decrease',current_date+35),
 ('30000000-0000-0000-0000-000000000002','J-102','Service workshop delivery','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',current_date-70,current_date-30,400000,'NZD','Correct responses',65,85,'percent of reviewed sample','increase',current_date-7),
 ('30000000-0000-0000-0000-000000000003','J-103','Service follow-up cards','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',current_date-70,current_date-35,100000,'NZD','Repeat contacts',20,10,'contacts per weekly sample','decrease',current_date-14);
 insert into milestones(code,title,project_id,due_on,status,evidence) values
 ('M-1','Observe induction pilot','30000000-0000-0000-0000-000000000001',current_date-2,'open',''),
 ('M-2','Supervisor sign-off','30000000-0000-0000-0000-000000000001',current_date+7,'open',''),
 ('M-3','Facilitate service workshop','30000000-0000-0000-0000-000000000002',current_date-31,'done','Fictional facilitator delivery record'),
 ('M-4','Review follow-up cards','30000000-0000-0000-0000-000000000003',current_date-36,'done','Fictional service lead sign-off');
 insert into allocations(code,project_id,person_id,week_on,hours,rate_cents) values
 ('A-1','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',mon,24,0),
 ('A-2','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',mon,8,0),
 ('A-3','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',mon+7,8,0);
 insert into time_entries(code,project_id,person_id,worked_on,hours,rate_cents,note) values
 ('T-1','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',current_date-1,6,0,'Drafted induction brief'),
 ('T-2','30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',current_date-32,5,0,'Facilitated workshop');
 insert into costs(code,title,project_id,amount_cents,status,evidence) values
 ('C-1','Fictional studio booking','30000000-0000-0000-0000-000000000001',50000,'committed','Demo supplier quote'),
 ('C-2','Fictional venue','30000000-0000-0000-0000-000000000002',20000,'paid','Demo receipt');
 update projects set status='active' where code='J-101';
 update projects set status='completed',completed_on=current_date-30 where code='J-102';
 update projects set status='completed',completed_on=current_date-35 where code='J-103';
 insert into outcomes(code,project_id,measured_on,actual,evidence) values('O-1','30000000-0000-0000-0000-000000000003',current_date-14,14,'Fictional sample of repeat contacts');
end $$;
