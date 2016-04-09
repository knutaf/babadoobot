'use strict';
import Chance = require("chance");
import fs = require("fs");
import sprintf_js = require("sprintf-js");
import path = require("path");

let g_log : fs.WriteStream = null;
let g_testingMode : boolean = false;

function log(text : string, ...args: any[])
{
    let message = text;
    if (args != null)
    {
        message = sprintf_js.vsprintf(text, args);
    }

    console.log(message);

    if (g_log != null)
    {
        g_log.write(message + "\r\n");
    }
}

function FilterNonNull(elem : any)
{
    return (elem != null);
}

function RandomArrayIndex(arr : any[], rand : Chance.Chance)
{
    return rand.integer({min: 0, max: arr.length-1});
}

function RandomArrayElement(arr : any[], rand : Chance.Chance)
{
    return arr[RandomArrayIndex(arr, rand)];
}

class BState {
    transitions : Transition[];

    constructor(public name : string)
    {
        this.transitions = [];
    }
}

class Transition {
    constructor(public text : string, public nextState : BState, public weight : number)
    {
    }
}

const StateInitial : BState = new BState("i");
const StateInitialSingle : BState = new BState("<i>");
const StateInitialB : BState = new BState("^b");
const StateB : BState = new BState("b");
const StateSingleB : BState = new BState("<b>");
const StateBB : BState = new BState("bb");
const StateA : BState = new BState("a");
const StateAA : BState = new BState("aa");
const StateSingleD : BState = new BState("<d>");
const StateD : BState = new BState("d");
const StateDD : BState = new BState("dd");
const StateO : BState = new BState("o");
const StateOO : BState = new BState("oo");

const StatePenultimateB : BState = new BState("b.$");
const StatePenultimateD : BState = new BState("d.$");

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

function GenerateWord(rand : Chance.Chance, wordLength : number)
{
    log("GenerateWord(" + wordLength + ")");

    let state : BState = StateInitial;
    let text : string = "";

    for (let i : number = 0; i < wordLength; i++)
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
                        log("Switching from StateB -> StatePenultimateB");
                        state = StatePenultimateB;
                        break;
                    }

                    case StateD:
                    {
                        log("Switching from StateD -> StatePenultimateD");
                        state = StatePenultimateD;
                        break;
                    }
                }
            }
        }

        let totalTransitionWeight : number = 0;
        for (let j : number = 0; j < state.transitions.length; j++)
        {
            totalTransitionWeight += state.transitions[j].weight;
        }

        const transitionWeightBucket : number = rand.integer({ min: 1, max: totalTransitionWeight});
        log("totalTransitionWeight = " + totalTransitionWeight + ", transitionWeightBucket = " + transitionWeightBucket);
        let chosenTransition : number = 0;
        let weight : number = state.transitions[chosenTransition].weight;
        while (weight < transitionWeightBucket)
        {
            chosenTransition++;
            weight += state.transitions[chosenTransition].weight;
        }

        log("picking transition " + chosenTransition + " from state " + state.name);

        if (chosenTransition >= state.transitions.length)
        {
            throw "invalid transition! " + chosenTransition;
        }

        const transition : Transition = state.transitions[chosenTransition];
        text += transition.text;
        state = transition.nextState;
    }

    return text;
}

const ME_TEXT : string[] =
[
    " (that's me!)"
    ," (who, me?)"
    ," (hi!)"
    ," (it's me!)"
    ," (yooo)"
    ," B)"
];

const SHEEP_TEXT : string[] =
[
    " (a sheep!)"
    ," (suddenly, a sheep!)"
    ," (turned into a sheep)"
];

const DELICIOUS_TEXT : string[] =
[
    " (mmm)"
    ," (delicious!)"
    ," (so good)"
    ," (i'm hungry)"
    ," (nom nom)"
];

const BOO_TEXT : string[] =
[
    "!"
    ," (a ghost!)"
    ," (spooky)"
    ,"hoo"
];

const HURT_TEXT : string[] =
[
    " (you ok?)"
    ," (medic!)"
    ," (need a doctor)"
    ," (it hooths)"
];

const BOBA_TEXT : string[] =
[
    " (as in fett)"
    ," (tea)"
    ," (fett, of course)"
    ," (nice jetpack)"
];

const DAD_TEXT : string[] =
[
    " (yes, son?)"
    ," (praise the son)"
    ," (bless you, my child)"
];

const DODO_TEXT : string[] =
[
    " (extinct)"
    ," (poor bird)"
    ," (the bird, long gone)"
];

const BAD_TEXT : string[] =
[
    "dger"
    ,"minton"
];

const BADA_TEXT : string[] =
[
    "bing"
];

function ProcessWords(rand : Chance.Chance, words : string[], maxNumChars : number)
{
    let modifiedWords : boolean[] = [];
    for (let i : number = 0; i < words.length; i++)
    {
        let word : string = words[i];
        modifiedWords[i] = true;
        switch (words[i])
        {
            case "adobada":
            case "adobo":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(DELICIOUS_TEXT, rand);
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
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(SHEEP_TEXT, rand);
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
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(ME_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "bad":
            {
                if (rand.bool({likelihood: 20}))
                {
                    words[i] += RandomArrayElement(BAD_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "bada":
            {
                if (rand.bool({likelihood: 20}))
                {
                    words[i] += RandomArrayElement(BADA_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "boba":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(BOBA_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "boo":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(BOO_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "booboo":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(HURT_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "dad":
            case "dada":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(DAD_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "dodo":
            {
                if (rand.bool())
                {
                    words[i] += RandomArrayElement(DODO_TEXT, rand);
                }
                else
                {
                    modifiedWords[i] = false;
                }
                break;
            }

            case "obobobo":
            {
                if (rand.bool())
                {
                    words[i] = "@/OboboboTheNinja";
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
            log("modified " + word + " (" + i + "): " + words[i]);
        }
    }

    let allWords : string = words.join(" ");
    while (allWords.length > maxNumChars)
    {
        log("words [" + allWords + "] is too long, " + allWords.length + " vs " + maxNumChars);

        let indexToDelete : number = RandomArrayIndex(words, rand);
        while (modifiedWords[indexToDelete])
        {
            indexToDelete = RandomArrayIndex(words, rand);
        }

        log("deleting word " + indexToDelete + " -- " + words[indexToDelete]);

        words[indexToDelete] = null;
        words = words.filter(FilterNonNull);
        allWords = words.join(" ");
    }

    return words;
}

function Main(args : string[])
{
    let seed : number = Math.round(Math.random() * 1000000000);

    for (let iArg : number = 2; iArg < args.length; iArg++)
    {
        switch (args[iArg])
        {
            case "-seed":
            {
                iArg++;
                if (iArg < args.length)
                {
                    seed = parseInt(args[iArg]);
                }
                else
                {
                    throw "arg -seed needs argument!";
                }
                break;
            }

            case "-test":
            {
                g_testingMode = true;
                break;
            }
        }
    }

    StartRound(seed);
}

function StartRound(seed : number)
{
    let scriptDir : string = path.dirname(global.process.argv[1]);
    fs.readdir(scriptDir, function(err : Error, files : string[])
    {
        if (!err)
        {
            let lastRound : number = 0;
            for (let i : number = 0; i < files.length; i++)
            {
                let matches : string[] = files[i].match(/^round_(\d+)\.log$/);
                if (matches != null)
                {
                    log("found matching file " + files[i]);

                    let roundNum : number = parseInt(matches[1]);
                    log("found round number " + roundNum);
                    if (roundNum > lastRound)
                    {
                        lastRound = roundNum;
                        log("last seen round is " + lastRound);
                    }
                }
            }

            Round(lastRound + 1, seed);
        }
        else
        {
            log("error reading dir " + scriptDir + "! " + err);
        }
    });
}

function Round(roundNum : number, seed : number)
{
    if (g_log != null)
    {
        g_log.end();
    }

    g_log = fs.createWriteStream(sprintf_js.sprintf("round_%04u.log", roundNum));

    const rand : Chance.Chance = new Chance(seed);

    let MIN_CHARS : number = 2;
    let MAX_CHARS : number = 140;
    let MIN_WORD_LENGTH : number = 1;
    let MAX_WORD_LENGTH : number = 10;

    if (g_testingMode)
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

    const numChars : number = rand.integer({min: MIN_CHARS, max: MAX_CHARS});
    log("Minimum " + numChars + " chars");

    let totalLength : number = 0;
    let wordLengths : number[] = [];
    while (totalLength < numChars)
    {
        const wordLength : number = rand.integer({min: MIN_WORD_LENGTH, max: MAX_WORD_LENGTH});
        totalLength += wordLength;
        wordLengths.push(wordLength);
    }

    log("Generating " + wordLengths.length + " words, total " + totalLength + " chars");

    let words : string[] = [];
    for (let i : number = 0; i < wordLengths.length; i++)
    {
        words.push(GenerateWord(rand, wordLengths[i]));
    }

    if (g_testingMode)
    {
        if (words.length > 5)
        {
           words[2] = "baa";
           words[5] = "obobobo";
        }
    }

    words = ProcessWords(rand, words, 140);

    const text : string = words.join(" ");
    log("Seeded with " + seed);
    log("#%04u (len=%u): %s", roundNum, text.length, text);
}

Main(global.process.argv);
