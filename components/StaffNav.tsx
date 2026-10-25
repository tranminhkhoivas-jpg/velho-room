"use client";
import {useEffect,useState} from "react";
export function StaffNav(){
 const [staff,setStaff]=useState(false);
 useEffect(()=>{fetch("/api/session").then(r=>r.json()).then(j=>setStaff(j.staff===true)).catch(()=>{});},[]);
 if(!staff)return null;
 return <nav className="noprint" aria-label="Staff session" style={{display:"flex",justifyContent:"flex-end",padding:"8px 16px"}}><button className="ghost" onClick={async()=>{
   const r=await fetch("/api/session",{method:"DELETE"});if(r.ok)location.assign("/login");
 }}>Sign out</button></nav>;
}
