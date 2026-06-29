import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Constants
const VOCAB_FILE_PATH = path.join(process.cwd(), 'data', 'Vocabulary.csv');
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gemma4:e2b';

// Function words to strip out if the LLM fails to drop them
const FUNCTION_WORDS = new Set([
    'A', 'AN', 'THE',
    'IS', 'ARE', 'AM', 'WAS', 'WERE', 'BE', 'BEEN', 'BEING',
    'DO', 'DOES', 'DID',
    'WILL', 'WOULD', 'SHALL', 'SHOULD',
    'CAN', 'COULD', 'MAY', 'MIGHT', 'MUST',
    'HAS', 'HAD', 'GOT'
]);

function loadVocabulary(): { vocabList: string[], vocabSet: Set<string>, multiWordSigns: Set<string> } {
    const vocabSet = new Set<string>();
    
    try {
        const fileContent = fs.readFileSync(VOCAB_FILE_PATH, 'utf-8');
        const lines = fileContent.split('\n');
        
        for (let i = 1; i < lines.length; i++) { // Skip header
            const row = lines[i].split(',')[0]?.trim();
            if (row && !['sign', '0', ''].includes(row.toLowerCase())) {
                if (!row.includes('|')) {
                    const upperSign = row.toUpperCase();
                    
                    if (upperSign.includes(':')) {
                        const parts = upperSign.split(':');
                        const cleaned = parts[1].trim();
                        if (cleaned) {
                            vocabSet.add(cleaned);
                        }
                        vocabSet.add(upperSign);
                    } else {
                        vocabSet.add(upperSign);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error reading Vocabulary.csv:", error);
    }
    
    const multiWordSigns = new Set<string>();
    for (const v of vocabSet) {
        if (v.includes(' ')) {
            multiWordSigns.add(v);
        }
    }
    
    return {
        vocabList: Array.from(vocabSet).sort(),
        vocabSet,
        multiWordSigns
    };
}

function buildPrompt(englishSentence: string, vocabList: string[], multiWordSigns: Set<string>): string {
    const vocabStr = vocabList.join(", ");
    const mwExamples = Array.from(multiWordSigns).sort().slice(0, 20).join(", ");
    
    return `You are an expert Indian Sign Language (ISL) linguist. Convert English sentences into ISL gloss sequences.

=== STRICT RULES (you MUST follow ALL of them) ===

RULE 1 - WORD ORDER (SOV): ISL uses Subject-Object-Verb order.
  English: "I eat food" -> ISL: ["I", "FOOD", "EAT"]

RULE 2 - QUESTION WORDS GO LAST: In questions, the wh-word (WHAT, WHERE, WHO, WHY, WHEN, WHICH, HOW MANY) MUST be the LAST token.
  English: "Where is my bag?" -> ISL: ["MY", "BAG", "WHERE"]
  English: "What is your name?" -> ISL: ["YOUR", "NAME", "WHAT"]

RULE 3 - NEGATION GOES LAST: NOT must be the last token.
  English: "I am not happy." -> ISL: ["I", "HAPPY", "NOT"]

RULE 4 - DROP FUNCTION WORDS: You MUST completely remove these words. NEVER include them in the output. NEVER fingerspell them:
  - Articles: a, an, the
  - Auxiliary verbs: is, are, am, was, were, be, been, being
  - Auxiliary "do": do, does, did (ALWAYS drop these — they are NEVER content words)
  - Modal verbs: will, would, shall, should, can, could, may, might, must
  - Other: has, had, got
  IMPORTANT: "do/does/did" are ALWAYS auxiliaries. NEVER include DO in the output. NEVER fingerspell DO.

RULE 5 - HAVE PLACEMENT: When "have" means possession (owning something), keep it and place it at the END of the sentence.
  English: "Do you have my eraser?" -> ISL: ["YOU", "MY", "ERASER", "HAVE"]
  English: "I have a pen." -> ISL: ["I", "PEN", "HAVE"]

RULE 6 - ADJECTIVES AFTER NOUN: Adjectives come after the noun they modify.
  English: "the big black cat" -> ISL: ["CAT", "BLACK", "BIG"]

RULE 7 - LEMMATIZE VERBS: Use base form of verbs (running->RUN, ate->EAT, walked->WALK).

RULE 8 - POSSESSIVE PRONOUNS: Keep possessive pronouns. "my"->MY, "your"->YOUR, "his"->HIS, "her"->HER, "our"->OUR. Do NOT drop them.

RULE 9 - MULTI-WORD SIGNS: Some signs in the vocabulary are multi-word phrases. You MUST keep them as a SINGLE element in the output list.
  Examples of multi-word signs: ${mwExamples}
  If the input contains "thank you", output ["THANK YOU"] as ONE element, NOT ["THANK", "YOU"].
  If the input contains "climb up", output ["CLIMB UP"] as ONE element.

RULE 10 - VOCABULARY CHECK: You MUST only use words from the vocabulary list. If a word is NOT in the vocabulary, you MUST fingerspell it as individual uppercase letters.
  Example: "apple" is NOT in the vocabulary -> spell it as "A", "P", "P", "L", "E"
  Example: "pratik" is NOT in the vocabulary -> spell it as "P", "R", "A", "T", "I", "K"

RULE 11 - OUTPUT FORMAT: Output ONLY a JSON list of uppercase strings. Nothing else. No explanation. No markdown.

=== VOCABULARY LIST (ONLY these words can be used as whole signs) ===
[${vocabStr}]

=== FEW-SHOT EXAMPLES ===

English: "Thank you very much"
Output: ["THANK YOU"]

English: "Where is my apple?"
Output: ["MY", "A", "P", "P", "L", "E", "WHERE"]

English: "What is your name?"
Output: ["YOUR", "NAME", "WHAT"]

English: "My name is Pratik"
Output: ["MY", "NAME", "P", "R", "A", "T", "I", "K"]

English: "I am not angry"
Output: ["I", "ANGRY", "NOT"]

English: "Do you have my eraser?"
Output: ["YOU", "MY", "ERASER", "HAVE"]

English: "She runs every morning"
Output: ["SHE", "MORNING", "RUN"]

English: "Who broke the door?"
Output: ["DOOR", "BREAK", "WHO"]

English: "Please help me"
Output: ["PLEASE", "ME", "HELP"]

English: "How many books do you have?"
Output: ["YOU", "BOOK", "HOW MANY"]

English: "I do not like this"
Output: ["I", "L", "I", "K", "E", "NOT"]

=== NOW CONVERT THIS ===

English: "${englishSentence}"
Output:`;
}

function fingerspell(word: string): string[] {
    const letters = [];
    for (let i = 0; i < word.length; i++) {
        const char = word[i].toUpperCase();
        if (/[A-Z]/.test(char)) {
            letters.push(char);
        }
    }
    return letters;
}

function validateAndFixGloss(rawGlossText: string, vocabSet: Set<string>, multiWordSigns: Set<string>): string[] {
    let tokens: string[] = [];
    
    // Extract JSON list
    const match = rawGlossText.match(/\[.*?\]/s);
    if (match) {
        try {
            tokens = JSON.parse(match[0]);
        } catch (e) {
            try {
                tokens = JSON.parse(match[0].replace(/'/g, '"'));
            } catch (e2) {
                tokens = rawGlossText.trim().split(/\s+/);
            }
        }
    } else {
        const text = rawGlossText.trim().replace(/^\[|\]$/g, '').replace(/["']/g, '');
        if (text.includes(',')) {
            tokens = text.split(',').map(t => t.trim()).filter(Boolean);
        } else {
            tokens = text.split(/\s+/);
        }
    }
    
    tokens = tokens.map(t => String(t).toUpperCase().trim()).filter(Boolean);
    tokens = tokens.filter(t => !FUNCTION_WORDS.has(t));
    
    const merged: string[] = [];
    let i = 0;
    while (i < tokens.length) {
        let matched = false;
        for (let window = 3; window > 0; window--) {
            if (i + window <= tokens.length) {
                const candidate = tokens.slice(i, i + window).join(" ");
                if (multiWordSigns.has(candidate)) {
                    merged.push(candidate);
                    i += window;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            merged.push(tokens[i]);
            i++;
        }
    }
    
    const validated: string[] = [];
    for (const token of merged) {
        if (vocabSet.has(token)) {
            validated.push(token);
        } else if (token.length === 1 && /[A-Z0-9]/.test(token)) {
            validated.push(token);
        } else {
            const letters = fingerspell(token);
            if (letters.length > 0) {
                validated.push(...letters);
            }
        }
    }
    
    return validated;
}

export async function POST(request: Request) {
    try {
        const { text } = await request.json();
        
        if (!text || typeof text !== 'string') {
            return NextResponse.json({ glosses: [] });
        }
        
        const { vocabList, vocabSet, multiWordSigns } = loadVocabulary();
        const prompt = buildPrompt(text, vocabList, multiWordSigns);
        
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama API returned ${response.status}`);
        }
        
        const data = await response.json();
        const rawResponse = data.response || '';
        
        const glosses = validateAndFixGloss(rawResponse, vocabSet, multiWordSigns);
        
        return NextResponse.json({ glosses });
        
    } catch (error) {
        console.error("Error processing gloss:", error);
        return NextResponse.json({ error: "Failed to generate glosses" }, { status: 500 });
    }
}
