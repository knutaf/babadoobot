function FilterNonNull(elem)
{
    return (elem != null);
}

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

var ME_TEXT =
[
    " (that's me!)"
    ," (who, me?)"
    ," (hi!)"
    ," (it's me!)"
    ," (yooo)"
    ," B)"
];

var SHEEP_TEXT =
[
    " (a sheep!)"
    ," (suddenly, a sheep!)"
    ," (turned into a sheep)"
];

var DELICIOUS_TEXT =
[
    " (mmm)"
    ," (delicious!)"
    ," (so good)"
    ," (i'm hungry)"
    ," (nom nom)"
];

var BOO_TEXT =
[
    "!"
    ," (a ghost!)"
    ," (spooky)"
    ,"hoo"
];

var HURT_TEXT =
[
    " (you ok?)"
    ," (medic!)"
    ," (need a doctor)"
    ," (it hooths)"
];

function ProcessWords(rand, words, maxNumChars)
{
    var modifiedWords = [];
    for (var i = 0; i < words.length; i++)
    {
        var word = words[i];
        modifiedWords[i] = true;
        switch (words[i])
        {
            case "boo":
            {
                if (rand.range(2))
                {
                    words[i] += BOO_TEXT[rand.range(BOO_TEXT.length)];
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "booboo":
            {
                if (rand.range(2))
                {
                    words[i] += HURT_TEXT[rand.range(HURT_TEXT.length)];
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "obobobo":
            {
                if (rand.range(2))
                {
                    words[i] = "@/OboboboTheNinja";
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "babadoo":
            case "babadoobo":
            {
                if (rand.range(2))
                {
                    words[i] += ME_TEXT[rand.range(ME_TEXT.length)];
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "baa":
            case "baabaa":
            {
                if (rand.range(2))
                {
                    words[i] += SHEEP_TEXT[rand.range(SHEEP_TEXT.length)];
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "adobada":
            case "adobo":
            {
                if (rand.range(2))
                {
                    words[i] += " " + DELICIOUS_TEXT[rand.range(DELICIOUS_TEXT.length)];
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            default:
            {
                modifiedWords[i] = false;
            }
        }

        if (modifiedWords[i])
        {
            console.log("modified " + word + " (" + i + "): " + words[i]);
        }
    }

    var allWords = words.join(" ");
    while (allWords.length > maxNumChars)
    {
        console.log("words [" + allWords + "] is too long, " + allWords.length + " vs " + maxNumChars);

        var validWordToDelete = false;
        var indexToDelete = rand.range(words.length);
        while (modifiedWords[indexToDelete])
        {
            indexToDelete = rand.range(words.length);
        }

        console.log("deleting word " + indexToDelete + " -- " + words[indexToDelete]);

        words[indexToDelete] = null;
        words = words.filter(FilterNonNull);
        allWords = words.join(" ");
    }

    return words;
}

function Main(args)
{
    var testingMode = false;
    var seed = "" + Math.random();

    for (var iArg = 2; iArg < args.length; iArg++)
    {
        switch (args[iArg])
        {
            case "-seed":
            {
                iArg++;
                if (iArg < args.length)
                {
                    seed = args[iArg];
                }
                else
                {
                    throw "arg -seed needs argument!";
                }
                break;
            }

            case "-test":
            {
                testingMode = true;
                break;
            }
        }
    }

    console.log("Seeding with " + seed);
    var gen = require("random-seed");
    var rand = gen.create(seed);

    var MIN_CHARS = 2;
    var MAX_CHARS = 70;
    var MIN_WORD_LENGTH = 1;
    var MAX_WORD_LENGTH = 10;

    if (testingMode)
    {
        /*
        MIN_CHARS = 10;
        MAX_CHARS = 10;
        MIN_WORD_LENGTH = 10;
        MAX_WORD_LENGTH = 10;
        */

        MIN_CHARS = 80;
        MAX_CHARS = 90;
        MIN_WORD_LENGTH = 1;
        MAX_WORD_LENGTH = 4;
    }

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

    var words = [];
    for (var i = 0; i < wordLengths.length; i++)
    {
        words.push(GenerateWord(rand, wordLengths[i]));
    }

    if (testingMode)
    {
        if (words.length > 5)
        {
           words[2] = "baa";
           words[5] = "obobobo";
        }
    }

    words = ProcessWords(rand, words, 140);

    var text = words.join(" ");
    console.log("text (len=" + text.length + "): " + text);
}

Main(process.argv);
