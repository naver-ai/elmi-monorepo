import axios, { Axios } from 'axios';
import pupa from 'pupa'

export class Http{

    static ENDPOINT_PING = "/ping"

    static ENDPOINT_APP = "/app"

    
    static ENDPOINT_APP_AUTH =`${this.ENDPOINT_APP}/auth`
    static ENDPOINT_APP_AUTH_LOGIN =`${this.ENDPOINT_APP_AUTH}/login`

    static ENDPOINT_APP_AUTH_VERIFY =`${this.ENDPOINT_APP_AUTH}/verify`

    static ENDPOINT_APP_PROJECTS =`${this.ENDPOINT_APP}/projects`

    static ENDPOINT_APP_PROJECTS_ID = `${this.ENDPOINT_APP_PROJECTS}/{project_id}`


    static ENDPOINT_APP_MEDIA = `${this.ENDPOINT_APP}/media`
    static ENDPOINT_APP_MEDIA_COVER = `${this.ENDPOINT_APP_MEDIA}/cover_image/{song_id}`
    

    

    static getTemplateEndpoint(template: string, values: {[key:string]: string}): string {
        return pupa(template, values)
      }
    
    private static _axiosInstance: Axios | undefined = undefined

    static get axios(): Axios {
        if(this._axiosInstance == null){
            this._axiosInstance = axios.create({
                baseURL: `http://${import.meta.env.VITE_BACKEND_HOSTNAME}:${import.meta.env.VITE_BACKEND_PORT}/api/v1`
              })
        }
        return this._axiosInstance!
    }

    static async getSignedInHeaders(token: string): Promise<any> {
        return {
          "Authorization": `Bearer ${token}`
        }
      }

}