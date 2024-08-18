
import fs from 'fs-extra'
import dotenv from 'dotenv'
import path from 'path'
import inquirer from 'inquirer'
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid'

const envPath = path.resolve(process.cwd(), ".env")

if(fs.existsSync(envPath) == false){
    fs.createFileSync(envPath)
}

function makeExistingValidator(message: string): (input: string) => true | string {
    return (input: string) => {
        if(input == null || input.trim().length == 0){
            return message
        }else{
            return true
        }
    }
}

const VITE_WHITELISTS: {[key:string]:boolean} = {
    "OPENAI_API_KEY": false,
    "GENIUS_ACCESS_TOKEN": false,
    "AUTH_SECRET": false,
    "ADMIN_ID": false,
    "ADMIN_HASHED_PW": false
    //"EXAMPLE_SONG_GDRIVE_ID": false
}


async function hashPassword(password:string): Promise<string>{
    let hp = await bcrypt.hash(password.trim(), 10)
    console.log(hp)
    return hp
}

async function setup(){

    const env = dotenv.config({path: envPath})

    const questions: Array<any> = []

    if(env.parsed?.["BACKEND_PORT"] == null){
        questions.push({
                type: 'input',
                name: 'BACKEND_PORT',
                default: '3000',
                message: 'Insert Backend port number:',
                validate: (input: string) =>  {
                    const pass = makeExistingValidator("Please enter a valid port number.")(input)
                    if(pass !== true){
                        return pass
                    }

                    try{
                        Number.parseInt(input)
                        return true
                    }catch(ex){
                        return "The port number must be an integer."
                    }
                }
            })
    }

    if(env.parsed?.["BACKEND_HOSTNAME"] == null){
        questions.push({
                type: 'input',
                name: 'BACKEND_HOSTNAME',
                default: '0.0.0.0',
                message: 'Insert Backend hostname WITHOUT protocol and port (e.g., 0.0.0.0, naver.com):',
                validate: makeExistingValidator("Please enter a valid hostname.")
            })
    }

    if(env.parsed?.["AUTH_SECRET"] == null){
        questions.push({
                type: 'input',
                name: 'AUTH_SECRET',
                default: 'NaverAILabHCIELMI',
                message: 'Insert any random string to be used as an auth secret:',
                validate: makeExistingValidator("Please enter any text.")
            })
    }

    if(env.parsed?.["OPENAI_API_KEY"] == null){
        questions.push({
                type: 'input',
                name: 'OPENAI_API_KEY',
                message: 'Insert OpenAI API Key:',
                validate: makeExistingValidator("Please enter a valid API key.")
            })
    }

    if(env.parsed?.["GENIUS_ACCESS_TOKEN"] == null){
        questions.push({
                type: 'input',
                name: 'GENIUS_ACCESS_TOKEN',
                message: 'Insert Access token for Genius.com:',
                validate: makeExistingValidator("Please enter a valid access token.")
            })
    }

    if(env.parsed?.["ADMIN_HASHED_PW"] == null){
        questions.push({
            type: 'password',
            name: 'ADMIN_HASHED_PW',
            message: "Set password for admin.",
            validate: makeExistingValidator("Please enter a valid access token.")
        })
    }
/*
    if(env.parsed?.["EXAMPLE_SONG_GDRIVE_ID"] == null){
        questions.push({
                type: 'input',
                name: 'EXAMPLE_SONG_GDRIVE_ID',
                message: 'Insert a file id of the example song in Google drive:',
                validate: makeExistingValidator("Please enter a valid file id.")
            })
    }*/

    const newObj: {[key:string]:string} = env.parsed as any



    if(env.parsed?.["ADMIN_ID"] == null){
        newObj["ADMIN_ID"] = nanoid()
    }

    if(questions.length > 0){
        const answers = await inquirer.prompt(questions)
        for(const key of Object.keys(answers)){
            if(key == "ADMIN_HASHED_PW"){
                newObj[key] = await hashPassword(answers[key])
            }else{
                newObj[key] = answers[key]
            }
        }
    }

    for(const key of Object.keys(newObj)){
        if(key.startsWith("VITE_") == false && VITE_WHITELISTS[key] !== false){
            newObj[`VITE_${key}`] = newObj[key]
        }
    }

    const envFileContent = Object.entries(newObj)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(envPath, envFileContent, {encoding:'utf-8'})

    fs.copyFileSync(envPath, path.join(process.cwd(), "/apps/elmi-web", ".env"))
    fs.copyFileSync(envPath, path.join(process.cwd(), "/apps/backend", ".env"))
}

setup().then()