'use strict';
import Chance = require("chance");
import fs = require("fs");
import sprintf_js = require("sprintf-js");
import path = require("path");
let Twitter : any = require("twitter");

const MAX_ALLOWED_CHARS = 140 - "#0000: ".length;
let g_log : fs.WriteStream = null;
let g_isLive : boolean = false;
let g_testingMode : boolean = false;
let g_roundIntervalInMilliseconds : number = parseInt(process.env["BABADOOBOT_ROUND_INTERVAL_HOURS"] || "6")  * 60 * 60 * 1000; // 12 hours

let g_twitterClient : any = new Twitter(
{
    consumer_key: process.env["TWITTER_CONSUMER_KEY"],
    consumer_secret: process.env["TWITTER_CONSUMER_SECRET"],
    access_token_key: process.env["TWITTER_ACCESS_TOKEN_KEY"],
    access_token_secret: process.env["TWITTER_ACCESS_TOKEN_SECRET"],
});

let MIN_GENERATED_CHARS : number;
let MAX_GENERATED_CHARS : number;
let MIN_WORD_LENGTH : number;
let MAX_WORD_LENGTH : number;
let WORD_COUNT_BETWEEN_PUNCTUATION : number;

function log(text : string) : void
{
    console.log(text);

    if (g_log != null)
    {
        g_log.write(text + "\r\n");
    }
}

function logf(format : string, ...args: any[]) : void
{
    let text : string = sprintf_js.vsprintf(format, args);

    console.log(text);

    if (g_log != null)
    {
        g_log.write(text + "\r\n");
    }
}

function GenerateNewSeed() : number
{
    return Math.round(Math.random() * 1000000000);
}

function FilterNonNull(elem : any) : boolean
{
    return (elem != null);
}

function RandomArrayIndex(arr : any[], rand : Chance.Chance) : number
{
    return rand.integer({min: 0, max: arr.length-1});
}

function RandomArrayElement<T>(arr : T[], rand : Chance.Chance) : T
{
    return arr[RandomArrayIndex(arr, rand)];
}

function CreateWordAppender(appended : string) : ((x : string) => string)
{
    return function(word : string) : string
    {
        return word + appended;
    };
}

function CreateWordReplacer(replacement : string) : ((x : string) => string)
{
    return function(word : string) : string
    {
        return replacement;
    };
}

function Tweet(text : string, andThen : (() => void)) : void
{
    if (g_isLive)
    {
        g_twitterClient.post('statuses/update', {status: text}, function(err : Error, tweet : any, response : any)
        {
            log("err: " + JSON.stringify(err, null, 4));
            log("tweeted: " + JSON.stringify(tweet, null, 4));  // Tweet body.
            log("response: " + JSON.stringify(response, null, 4));  // Raw response object.
            if (response != null && response.body != null)
            {
                let responseBody : any = JSON.parse(response.body);
                log("response.body: " + JSON.stringify(responseBody, null, 4));
            }

            andThen();
        });
    }
    else
    {
        andThen();
    }
}

class BState
{
    transitions : Transition[];

    constructor(public name : string)
    {
        this.transitions = [];
    }

    private static getTransitionWeight(t : Transition) : number
    {
        return t.weight;
    }

    public transitionWeights() : number[]
    {
        return this.transitions.map(BState.getTransitionWeight);
    }
}

class Transition
{
    constructor(public text : string, public nextState : BState, public weight : number)
    {
    }
}

class TextAfterWord
{
    constructor(public text : string, public wordIndex : number)
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

StateAA.transitions.push(new Transition("b", StateSingleB, 100));
StateAA.transitions.push(new Transition("d", StateSingleD, 100));

StateSingleD.transitions.push(new Transition("a", StateA, 100));
StateSingleD.transitions.push(new Transition("o", StateO, 100));

StateD.transitions.push(new Transition("a", StateA, 100));
StateD.transitions.push(new Transition("d", StateDD, 50));
StateD.transitions.push(new Transition("o", StateO, 100));

StateDD.transitions.push(new Transition("a", StateA, 100));
StateDD.transitions.push(new Transition("o", StateO, 100));

StateO.transitions.push(new Transition("b", StateB, 100));
StateO.transitions.push(new Transition("d", StateD, 100));
StateO.transitions.push(new Transition("o", StateOO, 50));

StateOO.transitions.push(new Transition("b", StateSingleB, 100));
StateOO.transitions.push(new Transition("d", StateSingleD, 100));

StatePenultimateB.transitions.push(new Transition("a", StateA, 100));
StatePenultimateB.transitions.push(new Transition("o", StateO, 100));

StatePenultimateD.transitions.push(new Transition("a", StateA, 100));
StatePenultimateD.transitions.push(new Transition("o", StateO, 100));

function GenerateWord(rand : Chance.Chance, wordLength : number) : string
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

        const transition : Transition = rand.weighted(state.transitions, state.transitionWeights());
        text += transition.text;
        state = transition.nextState;
    }

    return text;
}

const ME_TEXT : ((x : string) => string)[] =
[
    CreateWordReplacer("@babadoobot")
    , CreateWordAppender(" (that's me!)")
    , CreateWordAppender(" (who, me?)")
    , CreateWordAppender(" (hi!)")
    , CreateWordAppender(" (it's me!)")
    , CreateWordAppender(" (yooo)")
    , CreateWordAppender(" B)")
];

const SHEEP_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (a sheep!)")
    , CreateWordAppender(" (suddenly, a sheep!)")
    , CreateWordAppender(" (turned into a sheep)")
];

const DELICIOUS_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (mmm)")
    , CreateWordAppender(" (delicious!)")
    , CreateWordAppender(" (so good)")
    , CreateWordAppender(" (i'm hungry)")
    , CreateWordAppender(" (nom nom)")
];

const BOO_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender("!")
    , CreateWordAppender(" (a ghost!)")
    , CreateWordAppender(" (spooky)")
    , CreateWordAppender("hoo")
];

const HURT_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (you ok?)")
    , CreateWordAppender(" (medic!)")
    , CreateWordAppender(" (need a doctor)")
    , CreateWordAppender(" (it hooths)")
];

const BOBA_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (as in fett)")
    , CreateWordAppender(" (tea)")
    , CreateWordAppender(" (fett, of course)")
    , CreateWordAppender(" (nice jetpack)")
];

const DAD_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (yes, son?)")
    , CreateWordAppender(" (praise the son)")
    , CreateWordAppender(" (bless you, my child)")
];

const DODO_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (extinct)")
    , CreateWordAppender(" (poor bird)")
    , CreateWordAppender(" (the bird, long gone)")
];

const BAD_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender("ger")
    , CreateWordAppender("minton")
];

const BADA_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender("bing")
];

const DOOD_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender("!")
    , CreateWordAppender(" *squawk*")
    , CreateWordAppender(" <(\")")
    , CreateWordAppender(" <(^)")
    , CreateWordAppender(" (\")>")
    , CreateWordAppender(" (^)>")
    , CreateWordAppender(" <(*)")
    , CreateWordAppender(" (*)>")
];

const BOOB_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender(" (oh my!)")
    , CreateWordAppender(" (. Y .)")
    , CreateWordAppender(" (.Y.)")
];

const OBA_TEXT : ((x : string) => string)[] =
[
    CreateWordAppender("femi")
    , CreateWordAppender("femi martins")
    , CreateWordAppender(" (@/ObafemiMartins, that is)")
    , CreateWordAppender("flip")
    , CreateWordAppender("flippy martins")
];

const OBOBOBO_TEXT : ((x : string) => string)[] =
[
    CreateWordReplacer("@/OboboboTheNinja")
    , CreateWordAppender(" (the ninja)")
];

const PUNCTUATION_TEXT : string[] =
[
    "."
    , "?"
    , "!"
    , ";"
    , "..."
    , ","
];

function ProcessWords(rand : Chance.Chance, words : string[]) : string[]
{
    let modifiedWords : boolean[] = [];
    for (let i : number = 0; i < words.length; i++)
    {
        function InvokeRandomWordModifier(modifierChoices : ((x : string) => string)[], boolLikelihood : number = 50) : void
        {
            if (rand.bool({likelihood : boolLikelihood}))
            {
                words[i] = RandomArrayElement(modifierChoices, rand)(words[i]);
            }
            else
            {
                modifiedWords[i] = false;
            }
        }

        let word : string = words[i];
        modifiedWords[i] = true;
        switch (words[i])
        {
            case "adobada":
            case "adobo":
            {
                InvokeRandomWordModifier(DELICIOUS_TEXT);
                break;
            }

            case "baa":
            case "baabaa":
            {
                InvokeRandomWordModifier(SHEEP_TEXT);
                break;
            }

            case "babadoo":
            case "babadoobo":
            {
                InvokeRandomWordModifier(ME_TEXT);
                break;
            }

            case "bad":
            {
                InvokeRandomWordModifier(BAD_TEXT, 20);
                break;
            }

            case "bada":
            {
                InvokeRandomWordModifier(BADA_TEXT, 20);
                break;
            }

            case "boba":
            {
                InvokeRandomWordModifier(BOBA_TEXT);
                break;
            }

            case "boo":
            {
                InvokeRandomWordModifier(BOO_TEXT);
                break;
            }

            case "boob":
            {
                InvokeRandomWordModifier(BOOB_TEXT);
                break;
            }

            case "booboo":
            {
                InvokeRandomWordModifier(HURT_TEXT);
                break;
            }

            case "dad":
            case "dada":
            {
                InvokeRandomWordModifier(DAD_TEXT);
                break;
            }

            case "dodo":
            {
                InvokeRandomWordModifier(DODO_TEXT);
                break;
            }

            case "dood":
            {
                InvokeRandomWordModifier(DOOD_TEXT);
                break;
            }

            case "oba":
            {
                InvokeRandomWordModifier(OBA_TEXT);
                break;
            }

            case "obobobo":
            {
                InvokeRandomWordModifier(OBOBOBO_TEXT);
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
    while (allWords.length > MAX_ALLOWED_CHARS)
    {
        log("words [" + allWords + "] is too long, " + allWords.length + " vs " + MAX_ALLOWED_CHARS);

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

function AddPunctutation(rand : Chance.Chance, words : string[]) : string[]
{
    let totalLength : number = words.join(" ").length;

    let maxNumPunctuation : number = Math.ceil(words.length / WORD_COUNT_BETWEEN_PUNCTUATION) + 1;
    let numPunctuations : number = rand.integer({min : 0, max: maxNumPunctuation});
    log("generating " + numPunctuations + " punctuations. max-rand=" + maxNumPunctuation);

    let punctuations : TextAfterWord[] = [];

    // If we have any punctuation, at least end the tweet with a sentence end
    if (numPunctuations > 0)
    {
        let finalPunctuation : string = RandomArrayElement(PUNCTUATION_TEXT, rand);
        while (finalPunctuation == "," ||
               finalPunctuation == ";")
        {
            finalPunctuation = RandomArrayElement(PUNCTUATION_TEXT, rand);
        }

        punctuations.push(new TextAfterWord(finalPunctuation, words.length - 1));
    }

    for (let i : number = 0; i < numPunctuations - 1; i++)
    {
        // generate unique puncuation locations
        let punctuationIndex : number;
        let bFoundPunctuation : boolean = true;
        while (bFoundPunctuation)
        {
            bFoundPunctuation = false;
            punctuationIndex = RandomArrayIndex(words, rand);
            for (let tafIndex : number = 0; !bFoundPunctuation && tafIndex < punctuations.length; tafIndex++)
            {
                if (punctuations[tafIndex].wordIndex == punctuationIndex)
                {
                    bFoundPunctuation = true;
                }
            }
        }

        let punctuationText = RandomArrayElement(PUNCTUATION_TEXT, rand);
        while (punctuationText.length + totalLength > MAX_ALLOWED_CHARS)
        {
            punctuationText = RandomArrayElement(PUNCTUATION_TEXT, rand);
        }

        punctuations.push(new TextAfterWord(punctuationText, punctuationIndex));
        totalLength += punctuationText.length;
    }

    for (let tafIndex : number = 0; tafIndex < punctuations.length; tafIndex++)
    {
        words[punctuations[tafIndex].wordIndex] += punctuations[tafIndex].text;
    }

    return words;
}

function StartRound(seed : number, delayBeforeRoundStartInMilliseconds : number) : void
{
    // Find the last round that was done, so we can number the next round. This
    // matters for restarting the bot after process exit.
    let scriptDir : string = path.dirname(global.process.argv[1]);
    fs.readdir(scriptDir, function(err : Error, files : string[]) : void
    {
        if (!err)
        {
            let lastRound : number = 0;
            let lastRoundIndex : number = -1;
            for (let i : number = 0; i < files.length; i++)
            {
                let matches : string[] = files[i].match(/^round_(\d+)\.log$/);
                if (matches != null)
                {
                    let roundNum : number = parseInt(matches[1]);
                    if (roundNum > lastRound)
                    {
                        lastRound = roundNum;
                        lastRoundIndex = i;
                    }
                }
            }

            // Helper function to start the next round after a delay
            function StartWithDelay() : void
            {
                if (delayBeforeRoundStartInMilliseconds > 0)
                {
                    log("delaying for " + delayBeforeRoundStartInMilliseconds + " before starting next round");
                }

                setTimeout(function()
                {
                    if (delayBeforeRoundStartInMilliseconds > 0)
                    {
                        log("delay is done. starting round");
                    }

                    Round(lastRound + 1, seed);
                }, delayBeforeRoundStartInMilliseconds);
            }

            // Look at the creation time of the last round's log file to figure
            // out when it happened. Start our round g_roundIntervalInMilliseconds
            // after the last round, to make sure we don't tweet too often.
            //
            // If we were already supplied a delay or this is the first round
            // ever, then we don't need to look this up from the last log file.
            if (delayBeforeRoundStartInMilliseconds == 0 && lastRoundIndex != -1)
            {
                let lastRoundLogPath : string = path.join(scriptDir, files[lastRoundIndex]);
                fs.stat(lastRoundLogPath, function(err, stats)
                {
                    if (!err)
                    {
                        // for some reason birthtime isn't correct, but ctime
                        // is.
                        let lastRoundStartTime : number = stats.ctime.valueOf();
                        let nextRoundStartTime : number = lastRoundStartTime + g_roundIntervalInMilliseconds;
                        let nowTime : number = (new Date()).valueOf();
                        if (nextRoundStartTime > nowTime)
                        {
                            delayBeforeRoundStartInMilliseconds = nextRoundStartTime - nowTime;
                        }
                        else
                        {
                            log("past start time for next round, so starting now");
                        }

                        StartWithDelay();
                    }
                    else
                    {
                        log("error getting stats of " + lastRoundLogPath + "! " + err);
                    }
                });
            }
            else
            {
                StartWithDelay();
            }
        }
        else
        {
            log("error reading dir " + scriptDir + "! " + err);
        }
    });
}

function Round(roundNum : number, seed : number) : void
{
    log("");
    log("");
    logf("--------------- Round %04u --------------", roundNum);

    if (g_log != null)
    {
        g_log.end();
    }

    g_log = fs.createWriteStream(sprintf_js.sprintf("round_%04u.log", roundNum));

    const rand : Chance.Chance = new Chance(seed);

    MIN_GENERATED_CHARS = 2;
    MAX_GENERATED_CHARS = 50;
    MIN_WORD_LENGTH = 1;
    MAX_WORD_LENGTH = 10;
    WORD_COUNT_BETWEEN_PUNCTUATION = 3;

    if (rand.bool({likelihood: 20}))
    {
        log("long tweet mode for this round");
        MIN_GENERATED_CHARS = 30;
        MAX_GENERATED_CHARS = 125;
    }

    const numChars : number = rand.integer({min: MIN_GENERATED_CHARS, max: MAX_GENERATED_CHARS});
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

    /*
    if (g_testingMode)
    {
        if (words.length > 5)
        {
           words[2] = "oba";
           words[5] = "obobobo";
        }
    }
    */

    words = ProcessWords(rand, words);
    words = AddPunctutation(rand, words);

    log("Seeded with " + seed);

    const text : string = sprintf_js.sprintf("#%04u: %s", roundNum, words.join(" "));
    logf("(len=%u) %s", text.length, text);

    function NextRound() : void
    {
        StartRound(GenerateNewSeed(), g_roundIntervalInMilliseconds);
    }

    Tweet(text, NextRound);
}

function Main(args : string[]) : void
{
    let seed : number = GenerateNewSeed();

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

            case "-live":
            {
                g_isLive = true;
                break;
            }
        }
    }

    if (!g_isLive)
    {
        g_roundIntervalInMilliseconds = 10 * 1000;
    }

    if (!g_testingMode)
    {
        StartRound(seed, 0);
    }
    else
    {
        StartRound(seed, 1);
    }
}

Main(global.process.argv);
