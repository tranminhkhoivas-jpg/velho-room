export type QuizContext={task:string;constraints:string;people:number|null;weeklyHours:number|null;intent:"result-only"|"explore"|"meeting";contactPermission:boolean};
export function quizContext(raw:unknown,email:string):QuizContext{
 const x=(raw??{}) as Partial<QuizContext>;
 if(!x||typeof x!=="object"||Array.isArray(x))throw new Error("Check the task context.");
 const task=x.task??"",constraints=x.constraints??"",intent=x.intent??"result-only",contactPermission=x.contactPermission??false;
 if(typeof task!=="string"||task.length>1000||typeof constraints!=="string"||constraints.length>1000||!["result-only","explore","meeting"].includes(intent)||typeof contactPermission!=="boolean")throw new Error("Check task, constraints and follow-up choice.");
 const people=x.people??null,weeklyHours=x.weeklyHours??null;
 if(people!==null&&(!Number.isInteger(people)||people<1||people>100000)||weeklyHours!==null&&(!Number.isFinite(weeklyHours)||weeklyHours<0||weeklyHours>168))throw new Error("Check people (1–100,000) and weekly hours (0–168 per person).");
 if(contactPermission&&(!email||intent==="result-only"))throw new Error("Follow-up permission needs an email and an interest in a conversation.");
 return {task:task.trim(),constraints:constraints.trim(),people,weeklyHours,intent:intent as QuizContext["intent"],contactPermission};
}
export type LeadWork={owner:string;status:"new"|"reviewing"|"waiting"|"closed";nextAction:string;due:string;updated:number};
export function leadWork(raw:unknown):Omit<LeadWork,"updated">{
 const x=raw as LeadWork;
 if(!x||typeof x!=="object"||!["new","reviewing","waiting","closed"].includes(x.status)||typeof x.owner!=="string"||x.owner.length>200||typeof x.nextAction!=="string"||x.nextAction.length>1000||typeof x.due!=="string"||x.due&&!/^\d{4}-\d{2}-\d{2}$/.test(x.due))throw new Error("Check owner, status, next action and due date.");
 if(x.due&&new Date(x.due+"T12:00:00Z").toISOString().slice(0,10)!==x.due)throw new Error("Choose a valid due date.");
 if(x.status!=="new"&&(!x.owner.trim()||!x.nextAction.trim()))throw new Error("Assign an owner and next action before changing status.");
 return{owner:x.owner.trim(),status:x.status,nextAction:x.nextAction.trim(),due:x.due};
}
