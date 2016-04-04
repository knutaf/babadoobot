function BoboState(name)
{
    var name = name;
    var transitions = [];
}

function Transition(text, nextState, weight)
{
    var text = text;
    var nextState = nextState;
    var weight = weight;
}

var StateInitial = new BoboState("initial");
var StateB = new BoboState("b");
var StateBB = new BoboState("bb");
var StateA = new BoboState("a");
var StateD = new BoboState("d");
var StateDD = new BoboState("dd");
var StateO = new BoboState("o");
var StateOO = new BoboState("oo");

StateInitial.transitions.push(new Transition("b", StateB, 100));
StateInitial.transitions.push(new Transition("a", StateA, 100));
StateInitial.transitions.push(new Transition("d", StateD, 100));
StateInitial.transitions.push(new Transition("b", StateB, 100));
StateInitial.transitions.push(new Transition("b", StateB, 100));

function GenerateText()
{
}

function Main()
{
    //var Twit = require('twit');
    var text = GenerateText();
}

Main();
