export function createJsInvoker(argTypes,isClassMethodFunc,returns,isAsync) {
  if(isAsync)throw new Error('Async flight bindings are not supported');
  const stackNeeded=argTypes.slice(1).some(t=>t!==null&&t.destructorFunction===undefined);
  const count=argTypes.length-2;
  return function(humanName,throwBindingError,invoker,fn,runDestructors,fromRetWire,toClassParamWire,...converters) {
    return function(...args) {
      if(args.length!==count)throwBindingError(`${humanName} expects ${count} arguments`);
      const destructors=stackNeeded?[]:null,wired=[fn],converted=[];let result;
      try {
        if(isClassMethodFunc){const value=toClassParamWire(destructors,this);wired.push(value);converted.push([argTypes[1],value]);}
        for(let i=0;i<count;i++){const value=converters[i](destructors,args[i]);wired.push(value);converted.push([argTypes[i+2],value]);}
        result=invoker(...wired);
      } finally {
        if(stackNeeded)runDestructors(destructors);
        else for(const [type,value]of converted)if(type.destructorFunction)type.destructorFunction(value);
      }
      return returns?fromRetWire(result):undefined;
    };
  };
}
