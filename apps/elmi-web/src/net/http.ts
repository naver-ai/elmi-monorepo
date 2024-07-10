import axios, { Axios, CreateAxiosDefaults } from 'axios';
import pupa from 'pupa'

export class Http{

    static ENDPOINT_PING = "/ping"

    static ENDPOINT_APP = "/app"

    
    static ENDPOINT_APP_AUTH =`${this.ENDPOINT_APP}/auth`
    static ENDPOINT_APP_AUTH_LOGIN =`${this.ENDPOINT_APP_AUTH}/login`

    static ENDPOINT_APP_AUTH_VERIFY =`${this.ENDPOINT_APP_AUTH}/verify`

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