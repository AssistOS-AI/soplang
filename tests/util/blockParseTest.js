let util =require("../../src/util/soplangUtil.js")

let block = "@aliasHelloWorld alias doc1 helloWorld" + "\n" +
    "@something := [ := a1 b1 ] [ := a2 b2 ]  [ := a3 b3 c4 ] " + "\n" +
    "@changedText if [unequal $text 'abstract']  then  [ := @somethingAgain ]"+ "\n" +
    "overwrite aliasHelloWorld with $changedText"

let lines = util.parseCommandBlock("ch1","p1",  block);

console.log(lines);


