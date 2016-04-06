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

var StateInitial = new BoboState("i");
var StateInitialSingle = new BoboState("<i>");
var StateInitialB = new BoboState("^b");
var StateB = new BoboState("b");
var StateSingleB = new BoboState("<b>");
var StateBB = new BoboState("bb");
var StateA = new BoboState("a");
var StateAA = new BoboState("aa");
var StateSingleD = new BoboState("<d>");
var StateD = new BoboState("d");
var StateDD = new BoboState("dd");
var StateO = new BoboState("o");
var StateOO = new BoboState("oo");

var StatePenultimateB = new BoboState("b.$");
var StatePenultimateD = new BoboState("d.$");

StateInitial.transitions.push(new Transition("b", StateInitialB, 100));
StateInitial.transitions.push(new Transition("a", StateA, 100));
StateInitial.transitions.push(new Transition("d", StateSingleD, 100));
StateInitial.transitions.push(new Transition("o", StateO, 100));

StateInitialSingle.transitions.push(new Transition("a", StateA, 100));
StateInitialSingle.transitions.push(new Transition("o", StateO, 100));

StateInitialB.transitions.push(new Transition("a", StateA, 100));
StateInitialB.transitions.push(new Transition("o", StateO, 100));

StateB.transitions.push(new Transition("b", StateBB, 50));
StateB.transitions.push(new Transition("a", StateA, 100));
StateB.transitions.push(new Transition("d", StateSingleD, 100));
StateB.transitions.push(new Transition("o", StateO, 100));

StateSingleB.transitions.push(new Transition("a", StateA, 100));
StateSingleB.transitions.push(new Transition("o", StateO, 100));

StateBB.transitions.push(new Transition("a", StateA, 100));
StateBB.transitions.push(new Transition("o", StateO, 100));

StateA.transitions.push(new Transition("b", StateB, 100));
StateA.transitions.push(new Transition("a", StateAA, 25));
StateA.transitions.push(new Transition("d", StateD, 100));

StateAA.transitions.push(new Transition("b", StateB, 100));
StateAA.transitions.push(new Transition("d", StateD, 100));

StateSingleD.transitions.push(new Transition("a", StateA, 100));
StateSingleD.transitions.push(new Transition("o", StateO, 100));

StateD.transitions.push(new Transition("a", StateA, 100));
StateD.transitions.push(new Transition("d", StateDD, 50));
StateD.transitions.push(new Transition("o", StateO, 100));

StateDD.transitions.push(new Transition("a", StateA, 100));
StateDD.transitions.push(new Transition("o", StateO, 100));

StateO.transitions.push(new Transition("b", StateB, 100));
StateO.transitions.push(new Transition("d", StateD, 100));
StateO.transitions.push(new Transition("o", StateOO, 70));

StateOO.transitions.push(new Transition("b", StateSingleB, 100));
StateOO.transitions.push(new Transition("d", StateSingleD, 100));

StatePenultimateB.transitions.push(new Transition("a", StateA, 100));
StatePenultimateB.transitions.push(new Transition("o", StateO, 100));

StatePenultimateD.transitions.push(new Transition("a", StateA, 100));
StatePenultimateD.transitions.push(new Transition("o", StateO, 100));

function GenerateWord(rand, wordLength)
{
    console.log("GenerateWord(" + wordLength + ")");

    var state = StateInitial;
    var text = "";

    for (var i = 0; i < wordLength; i++)
    {
        if (i == wordLength-1)
        {
            // If a single letter word, use a different initial state
            if (i == 0)
            {
                if (state != StateInitial)
                {
                    throw "On single-letter word, somehow not at StateInitial! " + state.name;
                }

                state = StateInitialSingle;
            }

            // if at last letter, a few different states are used, to prevent
            // the word from sounding weird at the end
            else
            {
                switch (state)
                {
                    case StateB:
                    {
                        console.log("Switching from StateB -> StatePenultimateB");
                        state = StatePenultimateB;
                        break;
                    }

                    case StateD:
                    {
                        console.log("Switching from StateD -> StatePenultimateD");
                        state = StatePenultimateD;
                        break;
                    }
                }
            }
        }

        var totalTransitionWeight = 0;
        for (var j = 0; j < state.transitions.length; j++)
        {
            totalTransitionWeight += state.transitions[j].weight;
        }

        var transitionWeightBucket = rand.intBetween(1, totalTransitionWeight);
        console.log("totalTransitionWeight = " + totalTransitionWeight + ", transitionWeightBucket = " + transitionWeightBucket);
        var chosenTransition = 0;
        var weight = state.transitions[chosenTransition].weight;
        while (weight < transitionWeightBucket)
        {
            chosenTransition++;
            weight += state.transitions[chosenTransition].weight;
        }

        console.log("picking transition " + chosenTransition + " from state " + state.name);

        if (chosenTransition >= state.transitions.length)
        {
            throw "invalid transition! " + chosenTransition;
        }

        var transition = state.transitions[chosenTransition];
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

    var MIN_CHARS = 2;
    var MAX_CHARS = 70;
    var MIN_WORD_LENGTH = 1;
    var MAX_WORD_LENGTH = 10;

    /*
    var MIN_CHARS = 10;
    var MAX_CHARS = 10;
    var MIN_WORD_LENGTH = 10;
    var MAX_WORD_LENGTH = 10;
    */

    var numChars = rand.intBetween(MIN_CHARS, MAX_CHARS);
    console.log("Minimum " + numChars + " chars");

    var totalLength = 0;
    var wordLengths = [];
    while (totalLength < numChars)
    {
        var len = rand.intBetween(MIN_WORD_LENGTH, MAX_WORD_LENGTH);
        totalLength += len;
        wordLengths.push(len);
    }

    console.log("Generating " + wordLengths.length + " words, total " + totalLength + " chars");

    var text = "";
    for (var i = 0; i < wordLengths.length; i++)
    {
        if (i > 0)
        {
            text += " ";
        }

        text += GenerateWord(rand, wordLengths[i]);
    }

    console.log("text: " + text);
}

Main(process.argv);
