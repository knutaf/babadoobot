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
const MIN_WORD_LENGTH : number = 1;
const MAX_WORD_LENGTH : number = 10;
const WORD_COUNT_BETWEEN_PUNCTUATION : number = 3;

let WORD_LENGTHS : number[] = [];
let WORD_LENGTH_WEIGHTS : number[] = [];
for (let wordLength : number = MIN_WORD_LENGTH; wordLength <= MAX_WORD_LENGTH; wordLength++)
{
    WORD_LENGTHS.push(wordLength);

    let weight : number;
    switch (wordLength)
    {
        case 1:
        {
            weight = 50;
            break;
        }

        case 2:
        {
            weight = 75;
            break;
        }

        default:
        {
            weight = 100;
            break;
        }
    }

    WORD_LENGTH_WEIGHTS.push(weight);
}

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

class GeneratedWord
{
    constructor(public text : string, public modified : boolean)
    {
    }
}

class Punctuation
{
    constructor(public text : string, public weight : number, public isOkAtEnd : boolean, public surrounds : boolean)
    {
    }
}

function JoinGeneratedWords(words : GeneratedWord[]) : string
{
    let text : string = '';
    for (let i : number = 0; i < words.length; i++)
    {
        let word : GeneratedWord = words[i];
        text += word.text;
        if (!/[-\/]$/.test(word.text))
        {
            text += ' ';
        }
    }

    return text;
}

class PunctuationTargetingWord
{
    constructor(public punctuation : Punctuation, public wordIndex : number)
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

function GenerateWord(rand : Chance.Chance, wordLength : number) : GeneratedWord
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

    return new GeneratedWord(text, false);
}

const PUNCTUATIONS : Punctuation[] =
[
      new Punctuation(".",      100, true,   false)
    , new Punctuation("?",      90,  true,   false)
    , new Punctuation("!",      90,  true,   false)
    , new Punctuation(";",      100, false,  false)
    , new Punctuation("...",    100, true,   false)
    , new Punctuation(",",      100, false,  false)
    , new Punctuation("-",      40,  false,  false)
    , new Punctuation("--",     50,  false,  false)
    , new Punctuation("\"\"",   50,  false,  true)
    , new Punctuation("~~",     20,  false,  true)
    , new Punctuation("/",      40,  false,  false)
    , new Punctuation(" &",     35,  false,  false)
];

const PUNCTUATION_WEIGHTS : number[] = PUNCTUATIONS.map((p : Punctuation) => { return p.weight; });

function TrimGeneratedWordsToLength(words : GeneratedWord[], lengthLimit : number, rand : Chance.Chance) : GeneratedWord[]
{
    let allWords : string = JoinGeneratedWords(words);
    log("TrimGeneratedWordsToLength length " + allWords.length + " to " + lengthLimit);
    while (allWords.length > lengthLimit)
    {
        log("words [" + allWords + "] is too long, " + allWords.length + " vs " + lengthLimit);

        let indexToDelete : number = RandomArrayIndex(words, rand);
        while (words[indexToDelete].modified)
        {
            indexToDelete = RandomArrayIndex(words, rand);
        }

        log("deleting word " + indexToDelete + " -- " + words[indexToDelete].text);

        words[indexToDelete] = null;
        words = words.filter(FilterNonNull);
        allWords = JoinGeneratedWords(words);
    }

    return words;
}

function ProcessWords(words : GeneratedWord[], rand : Chance.Chance) : GeneratedWord[]
{
    for (let i : number = 0; i < words.length; i++)
    {
        function InvokeRandomWordModifier(modifierChoices : ((x : string) => string)[], boolLikelihood : number = 50) : void
        {
            if (rand.bool({likelihood : boolLikelihood}))
            {
                let originalWord : string = words[i].text;
                words[i].text = RandomArrayElement(modifierChoices, rand)(originalWord);
                words[i].modified = true;
                log("modified " + originalWord + " (" + i + "): " + words[i].text);
            }
        }

        switch (words[i].text)
        {
            case "adobada":
            case "adobo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (mmm)")
                        , CreateWordAppender(" (delicious!)")
                        , CreateWordAppender(" (so good)")
                        , CreateWordAppender(" (i'm hungry)")
                        , CreateWordAppender(" (nom nom)")
                    ]);
                break;
            }

            case "baa":
            case "baabaa":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (a sheep!)")
                        , CreateWordAppender(" (suddenly, a sheep!)")
                        , CreateWordAppender(" (turned into a sheep)")
                    ]);
                break;
            }

            case "babadoo":
            case "babadoobo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordReplacer("@babadoobot")
                        , CreateWordAppender(" (that's me!)")
                        , CreateWordAppender(" (who, me?)")
                        , CreateWordAppender(" (hi!)")
                        , CreateWordAppender(" (it's me!)")
                        , CreateWordAppender(" (yooo)")
                        , CreateWordAppender(" B)")
                    ]);
                break;
            }

            case "bad":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender("ger")
                        , CreateWordAppender("minton")
                    ], 20);
                break;
            }

            case "bada":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender("bing")
                    ], 20);
                break;
            }

            case "boba":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (as in fett)")
                        , CreateWordAppender(" (tea)")
                        , CreateWordAppender(" (fett, of course)")
                        , CreateWordAppender(" (nice jetpack)")
                    ]);
                break;
            }

            case "boo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender("!")
                        , CreateWordAppender(" (a ghost!)")
                        , CreateWordAppender(" (spooky)")
                        , CreateWordAppender("hoo")
                    ]);
                break;
            }

            case "boob":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (oh my!)")
                        , CreateWordAppender(" (. Y .)")
                        , CreateWordAppender(" (.Y.)")
                    ]);
                break;
            }

            case "booboo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (you ok?)")
                        , CreateWordAppender(" (medic!)")
                        , CreateWordAppender(" (need a doctor)")
                        , CreateWordAppender(" (it hooths)")
                    ]);
                break;
            }

            case "dad":
            case "dada":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (yes, son?)")
                        , CreateWordAppender(" (praise the son)")
                        , CreateWordAppender(" (bless you, my child)")
                    ]);
                break;
            }

            case "dodo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender(" (extinct)")
                        , CreateWordAppender(" (poor bird)")
                        , CreateWordAppender(" (the bird, long gone)")
                    ]);
                break;
            }

            case "dood":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender("!")
                        , CreateWordAppender(" *squawk*")
                        , CreateWordAppender(" <(\")")
                        , CreateWordAppender(" <(^)")
                        , CreateWordAppender(" (\")>")
                        , CreateWordAppender(" (^)>")
                        , CreateWordAppender(" <(*)")
                        , CreateWordAppender(" (*)>")
                    ]);
                break;
            }

            case "oba":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordAppender("femi")
                        , CreateWordAppender("femi martins")
                        , CreateWordAppender(" (@/ObafemiMartins, that is)")
                        , CreateWordAppender("flip")
                        , CreateWordAppender("flippy martins")
                    ]);
                break;
            }

            case "obobobo":
            {
                InvokeRandomWordModifier(
                    [
                        CreateWordReplacer("@/OboboboTheNinja")
                        , CreateWordAppender(" (the ninja)")
                    ]);
                break;
            }
        }
    }

    words = TrimGeneratedWordsToLength(words, MAX_ALLOWED_CHARS, rand);
    return words;
}

function AddPunctutation(words : GeneratedWord[], rand : Chance.Chance) : GeneratedWord[]
{
    // Add 1 to always allow a possible sentence end, even for short sentences
    let maxNumPunctuation : number = Math.floor(words.length / WORD_COUNT_BETWEEN_PUNCTUATION) + 1;

    let numPunctuations : number = rand.integer({min : 0, max: maxNumPunctuation});
    log("generating " + numPunctuations + " punctuations. max-rand=" + maxNumPunctuation);

    let punctuations : PunctuationTargetingWord[] = [];

    let lengthLimit : number = MAX_ALLOWED_CHARS;
    let punctuationLength : number = 0;
    for (let i : number = 0; i < numPunctuations; i++)
    {
        // Arbitrarily choose the first element to be the one that targets
        // the last word.
        let punctuation : Punctuation;
        do
        {
            punctuation = rand.weighted(PUNCTUATIONS, PUNCTUATION_WEIGHTS);
        } while (i == 0 && !punctuation.isOkAtEnd);

        punctuationLength += punctuation.text.length;
        log("punctuationLength: " + punctuationLength);

        // make sure there's enough room for punctuation text
        words = TrimGeneratedWordsToLength(words, lengthLimit - punctuationLength, rand);

        punctuations.push(new PunctuationTargetingWord(punctuation, null));
    }

    if (punctuations.length > 0)
    {
        punctuations[0].wordIndex = words.length - 1;
    }

    // We've already filled in element 0 (the last word). Now generate random
    // locations for the rest of the punctuation marks.
    for (let i : number = 1; i < punctuations.length; i++)
    {
        let targetedWordIndex : number;
        let bFoundPunctuation : boolean = true;
        while (bFoundPunctuation)
        {
            bFoundPunctuation = false;
            targetedWordIndex = RandomArrayIndex(words, rand);
            for (let ptwIndex : number = 0; !bFoundPunctuation && ptwIndex < punctuations.length; ptwIndex++)
            {
                if (punctuations[ptwIndex].wordIndex == targetedWordIndex)
                {
                    bFoundPunctuation = true;
                }
            }
        }

        punctuations[i].wordIndex = targetedWordIndex;
    }

    for (let ptwIndex : number = 0; ptwIndex < punctuations.length; ptwIndex++)
    {
        let ptw : PunctuationTargetingWord = punctuations[ptwIndex];
        if (ptw.punctuation.surrounds)
        {
            words[ptw.wordIndex].text = "" + ptw.punctuation.text[0] + words[ptw.wordIndex].text + ptw.punctuation.text[1];
        }
        else
        {
            words[ptw.wordIndex].text += ptw.punctuation.text;
        }
    }

    let totalLength : number = JoinGeneratedWords(words).length;
    if (totalLength > MAX_ALLOWED_CHARS)
    {
        throw "generated too long text! " + totalLength + " vs " + MAX_ALLOWED_CHARS;
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
    try
    {
        log("");
        log("");
        logf("--------------- Round %04u, seed %u --------------", roundNum, seed);

        if (g_log != null)
        {
            g_log.end();
        }

        g_log = fs.createWriteStream(sprintf_js.sprintf("round_%04u.log", roundNum));

        const rand : Chance.Chance = new Chance(seed);

        MIN_GENERATED_CHARS = 2;
        MAX_GENERATED_CHARS = 50;

        if (rand.bool({likelihood: 30}))
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
            const wordLength : number = rand.weighted(WORD_LENGTHS, WORD_LENGTH_WEIGHTS);
            totalLength += wordLength;
            wordLengths.push(wordLength);
        }

        log("Generating " + wordLengths.length + " words, total " + totalLength + " chars");

        let words : GeneratedWord[] = [];
        for (let i : number = 0; i < wordLengths.length; i++)
        {
            words.push(GenerateWord(rand, wordLengths[i]));
        }

        /*
        if (g_testingMode)
        {
            if (words.length > 5)
            {
               words[2].text = "oba";
               words[5].text = "obobobo";
            }
        }
        */

        words = ProcessWords(words, rand);
        words = AddPunctutation(words, rand);

        log("(reminder) Seeded with " + seed);

        const text : string = sprintf_js.sprintf("#%04u: %s", roundNum, JoinGeneratedWords(words));
        logf("(len=%u) %s", text.length, text);

        function NextRound() : void
        {
            StartRound(GenerateNewSeed(), g_roundIntervalInMilliseconds);
        }

        Tweet(text, NextRound);
    }
    catch (ex)
    {
        log("ex: " + ex + ". " + ex.stack);
        if (g_log != null)
        {
            g_log.end();
        }
    }
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
