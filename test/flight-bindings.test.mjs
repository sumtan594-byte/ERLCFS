import test from 'node:test';
import assert from 'node:assert/strict';
import {createJsInvoker} from '../lib/flight-wasm-bindings.js';
test('CSP-safe flight bindings retain method receivers and destroy converted arguments',()=>{
  const destroyed=[],type={destructorFunction:v=>destroyed.push(v)},ret={isVoid:false},receiver={id:3};
  const factory=createJsInvoker([ret,type,type],true,true,false);
  const fn=factory('method',message=>{throw Error(message);},(target,self,arg)=>target+self+arg,2,()=>{},n=>n*2,(_,self)=>self.id,(_,n)=>n+1);
  assert.equal(fn.call(receiver,4),20);assert.deepEqual(destroyed,[3,5]);assert.throws(()=>fn.call(receiver),/expects 1 arguments/);
});
test('CSP-safe bindings clean their destructor stack even when native invocation fails',()=>{
  const type={destructorFunction:undefined};let cleaned=false;
  const fn=createJsInvoker([{isVoid:true},null,type],false,false,false)('test',()=>{},()=>{throw Error('native failure');},0,stack=>{cleaned=stack.length===1;},()=>{},null,(stack,n)=>{stack.push(n);return n;});
  assert.throws(()=>fn(3),/native failure/);assert.ok(cleaned);assert.throws(()=>createJsInvoker([],false,false,true),/Async/);
});
