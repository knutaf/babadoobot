function BoboState(name)
{
    this.name = name;
    this.transitions = [];
}

function Transition(text, nextState, weight)
{
    this.text = text;
    this.nextState = nextState;
    this.weight = weight;
}

var StateInitial = new BoboState("initial");
var StateInitialB = new BoboState("^b");
var StateB = new BoboState("b");
var StateBB = new BoboState("bb");
var StateA = new BoboState("a");
var StateAA = new BoboState("aa");
var StateSingleD = new BoboState("<d>");
var StateD = new BoboState("d");
var StateDD = new BoboState("dd");
var StateO = new BoboState("o");
var StateOO = new BoboState("oo");

StateInitial.transitions.push(new Transition("b", StateInitialB, 100));
StateInitial.transitions.push(new Transition("a", StateA, 100));
StateInitial.transitions.push(new Transition("d", StateSingleD, 100));
StateInitial.transitions.push(new Transition("o", StateO, 100));

StateInitialB.transitions.push(new Transition("a", StateA, 100));
StateInitialB.transitions.push(new Transition("o", StateO, 100));

StateB.transitions.push(new Transition("b", StateBB, 100));
StateB.transitions.push(new Transition("a", StateA, 100));
StateB.transitions.push(new Transition("d", StateSingleD, 100));
StateB.transitions.push(new Transition("o", StateO, 100));

StateBB.transitions.push(new Transition("a", StateA, 100));
StateBB.transitions.push(new Transition("o", StateO, 100));

StateA.transitions.push(new Transition("b", StateB, 100));
StateA.transitions.push(new Transition("a", StateAA, 100));
StateA.transitions.push(new Transition("d", StateD, 100));

StateAA.transitions.push(new Transition("b", StateB, 100));
StateAA.transitions.push(new Transition("d", StateD, 100));

StateSingleD.transitions.push(new Transition("a", StateA, 100));
StateSingleD.transitions.push(new Transition("o", StateO, 100));

StateD.transitions.push(new Transition("a", StateA, 100));
StateD.transitions.push(new Transition("d", StateDD, 100));
StateD.transitions.push(new Transition("o", StateO, 100));

StateDD.transitions.push(new Transition("a", StateA, 100));
StateDD.transitions.push(new Transition("o", StateO, 100));

StateO.transitions.push(new Transition("b", StateB, 100));
StateO.transitions.push(new Transition("d", StateD, 100));
StateO.transitions.push(new Transition("o", StateOO, 100));

StateOO.transitions.push(new Transition("b", StateB, 100));
StateOO.transitions.push(new Transition("d", StateD, 100));

function GenerateText(rand)
{
    var state = StateInitial;
    var text = "";

    for (var i = 0; i < 10; i++)
    {
        var whichTransition = rand.range(state.transitions.length);
        console.log("picking transition " + whichTransition + " from state " + state.name);

        var transition = state.transitions[whichTransition];
        text += transition.text;
        state = transition.nextState;
    }

    return text;
}

function Main(args)
{
    var seed = "" + Math.random();
    if (args.length > 2)
    {
        seed = args[2];
    }

    console.log("Seeding with " + seed);
    var gen = require("random-seed");
    var rand = gen.create(seed);

    //var Twit = require('twit');
    var text = GenerateText(rand);
    console.log("text: " + text);
}

Main(process.argv);
