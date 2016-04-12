'use strict';
import Chance = require("chance");
import fs = require("fs");
import sprintf_js = require("sprintf-js");
import path = require("path");
let Twitter : any = require("twitter");

let g_log : fs.WriteStream = null;
let g_isLive : boolean = false;
let g_testingMode : boolean = false;
let g_roundIntervalInMilliseconds : number = 12 * 60 * 60 * 1000; // 12 hours

let g_twitterClient : any = new Twitter(
{
    consumer_key: process.env["TWITTER_CONSUMER_KEY"],
    consumer_secret: process.env["TWITTER_CONSUMER_SECRET"],
    access_token_key: process.env["TWITTER_ACCESS_TOKEN_KEY"],
    access_token_secret: process.env["TWITTER_ACCESS_TOKEN_SECRET"],
});

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
StateO.transitions.push(new Transition("o", StateOO, 70));

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

const DOOD_TEXT : string[] =
[
    "!"
    , " *squawk*"
    , " <(\")"
    , " <(^)"
    , " (\")>"
    , " (^)>"
    , " <(*)"
    , " (*)>"
];

const BOOB_TEXT : string[] =
[
    " (oh my!)"
    , " (. Y .)"
    , " (.Y.)"
];

function ProcessWords(rand : Chance.Chance, words : string[], maxNumChars : number) : string[]
{
    let modifiedWords : boolean[] = [];
    for (let i : number = 0; i < words.length; i++)
    {
        function RandomAppend(textChoices : string[], boolLikelihood : number = 50) : void
        {
            if (rand.bool({likelihood : boolLikelihood}))
            {
                words[i] += RandomArrayElement(textChoices, rand);
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
                RandomAppend(DELICIOUS_TEXT);
                break;
            }

            case "baa":
            case "baabaa":
            {
                RandomAppend(SHEEP_TEXT);
                break;
            }

            case "babadoo":
            case "babadoobo":
            {
                RandomAppend(ME_TEXT);
                break;
            }

            case "bad":
            {
                RandomAppend(BAD_TEXT, 20);
                break;
            }

            case "bada":
            {
                RandomAppend(BADA_TEXT, 20);
                break;
            }

            case "boba":
            {
                RandomAppend(BOBA_TEXT);
                break;
            }

            case "boo":
            {
                RandomAppend(BOO_TEXT);
                break;
            }

            case "boob":
            {
                RandomAppend(BOOB_TEXT);
                break;
            }

            case "booboo":
            {
                RandomAppend(HURT_TEXT);
                break;
            }

            case "dad":
            case "dada":
            {
                RandomAppend(DAD_TEXT);
                break;
            }

            case "dodo":
            {
                RandomAppend(DODO_TEXT);
                break;
            }

            case "dood":
            {
                RandomAppend(DOOD_TEXT);
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
                    log("found matching file " + files[i]);

                    let roundNum : number = parseInt(matches[1]);
                    log("found round number " + roundNum);
                    if (roundNum > lastRound)
                    {
                        lastRound = roundNum;
                        lastRoundIndex = i;
                        log("last seen round is " + lastRound);
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

    let MIN_CHARS : number = 2;
    let MAX_CHARS : number = 30;
    let MIN_WORD_LENGTH : number = 1;
    let MAX_WORD_LENGTH : number = 10;

    if (rand.bool({likelihood: 20}))
    {
        log("long tweet mode for this round");
        MIN_CHARS = 30;
        MAX_CHARS = 130;
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

    StartRound(seed, 0);
}

Main(global.process.argv);
