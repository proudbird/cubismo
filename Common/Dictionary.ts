import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ApplicationSettings } from "../cubismo/types";

export default class Dictionary {
  
  #vocabulary: string;

  constructor(settings: ApplicationSettings) {


    const appDir = settings.dirname;
    const vocabularyFileName = join(appDir, 'vocabulary.json');
    if(existsSync(vocabularyFileName)) {
      this.#vocabulary = JSON.parse(readFileSync(vocabularyFileName, 'utf-8'));
    }
  }

  translate(value: string, locale: string): string {

    if(!this.#vocabulary) {
      throw new Error(`Can't find vocabulary`);
    }

    const article = this.#vocabulary[value];
    if(!article) {
      throw new Error(`Can't find article '${value}' in the vocabulare`);
    }
    
    const translation = article[locale];
    if(!translation) {
      throw new Error(`Can't find translation of article '${value}' in the vocabulare for locale '${locale}'`);
    }

    return translation;
  }
}