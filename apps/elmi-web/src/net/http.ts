import axios, { Axios } from 'axios';
import pupa from 'pupa'

export class Http{

    static ENDPOINT_PING = "/ping"

    static ENDPOINT_APP = "/app"

    static ENDPOINT_CHAT = "/chat";

    
    static ENDPOINT_APP_AUTH =`${this.ENDPOINT_APP}/auth`
    static ENDPOINT_APP_AUTH_LOGIN =`${this.ENDPOINT_APP_AUTH}/login`

    static ENDPOINT_APP_AUTH_VERIFY =`${this.ENDPOINT_APP_AUTH}/verify`

    static ENDPOINT_APP_PROJECTS =`${this.ENDPOINT_APP}/projects`

    static ENDPOINT_APP_PROJECTS_ID = `${this.ENDPOINT_APP_PROJECTS}/{project_id}`

    static ENDPOINT_APP_PROJECTS_ID_ANNOTATIONS_ALL = `${this.ENDPOINT_APP_PROJECTS_ID}/annotations/all`
    static ENDPOINT_APP_PROJECTS_ID_INSPECTIONS_ALL = `${this.ENDPOINT_APP_PROJECTS_ID}/inspections/all`


    static ENDPOINT_APP_MEDIA = `${this.ENDPOINT_APP}/media`
    static ENDPOINT_APP_MEDIA_SONGS = `${this.ENDPOINT_APP_MEDIA}/songs`

    static ENDPOINT_APP_MEDIA_SONGS_ID = `${this.ENDPOINT_APP_MEDIA_SONGS}/{song_id}`
    static ENDPOINT_APP_MEDIA_SONGS_ID_COVER = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/cover_image`
    static ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/audio`
    static ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO_SAMPLES = `${this.ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO}/samples`
    

    static ENDPOINT_APP_PROJECTS_ID_CHAT = `${this.ENDPOINT_APP_PROJECTS_ID}/chat`
    static ENDPOINT_APP_PROJECTS_ID_CHAT_ALL = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT}/all`

    static ENDPOINT_APP_PROJECTS_ID_CHAT_THREAD = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT}/thread`;
    static ENDPOINT_APP_PROJECTS_ID_CHAT_MESSAGE = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT}/message`;

    

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

    static getSignedInHeaders(token: string): any {
        return {
          "Authorization": `Bearer ${token}`
        }
      }


    // Fetch chat data for a project
    static async fetchChatData(projectId: string, token: string) {
      const url = this.getTemplateEndpoint(this.ENDPOINT_APP_PROJECTS_ID_CHAT_ALL, { project_id: projectId });
      const response = await this.axios.get(url, { headers: this.getSignedInHeaders(token) });
      return response.data;
    }

    // Initialize a chat thread
    static async initializeThread(projectId: string, lineId: string, mode: string, token: string) {
      const url = this.getTemplateEndpoint(this.ENDPOINT_APP_PROJECTS_ID_CHAT_THREAD, { project_id: projectId });
      console.log(`Making request to URL: ${url} with data: ${JSON.stringify({ project_id: projectId, line_id: lineId, mode })}`);
      const response = await this.axios.post(url, { project_id: projectId, line_id: lineId, mode }, { headers: this.getSignedInHeaders(token) });
      return response.data;
    }

  // Send a chat message
  static async sendMessage(projectId: string, threadId: string, message: string, role: string, mode: string, token: string) {
    const url = this.getTemplateEndpoint(this.ENDPOINT_APP_PROJECTS_ID_CHAT_MESSAGE, { project_id: projectId });
    console.log(`Sending message to URL: ${url} with data: ${JSON.stringify({ thread_id: threadId, message, role, mode })}`);
    const response = await this.axios.post(url, { thread_id: threadId, message, role, mode }, { headers: this.getSignedInHeaders(token) });
    return response.data;
  }
}