import axios, { Axios } from 'axios';
import pupa from 'pupa';
import { InteractionType } from '../model-types';
import moment from 'moment-timezone';

export class Http {
  static ENDPOINT_PING = '/ping';

  static ENDPOINT_APP = '/app';

  static ENDPOINT_CHAT = '/chat';

  static ENDPOINT_ADMIN = "/admin"

  static ENDPOINT_APP_AUTH = `${this.ENDPOINT_APP}/auth`;
  static ENDPOINT_APP_AUTH_LOGIN = `${this.ENDPOINT_APP_AUTH}/login`;

  static ENDPOINT_APP_AUTH_VERIFY = `${this.ENDPOINT_APP_AUTH}/verify`;

  static ENDPOINT_APP_AUTH_PROFILE = `${this.ENDPOINT_APP_AUTH}/profile`;

  static ENDPOINT_APP_PROJECTS = `${this.ENDPOINT_APP}/projects`;

  static ENDPOINT_APP_PROJECTS_ALL = `${this.ENDPOINT_APP_PROJECTS}/all`;

  static ENDPOINT_APP_PROJECTS_NEW = `${this.ENDPOINT_APP_PROJECTS}/new`;

  static ENDPOINT_APP_PROJECTS_ID = `${this.ENDPOINT_APP_PROJECTS}/{project_id}`;
  static ENDPOINT_APP_PROJECTS_ID_LINES_ID = `${this.ENDPOINT_APP_PROJECTS_ID}/lines/{line_id}`;
  static ENDPOINT_APP_PROJECTS_ID_LINES_ID_TRANSLATION = `${this.ENDPOINT_APP_PROJECTS_ID_LINES_ID}/translation`;

  static ENDPOINT_APP_PROJECTS_ID_LINES_ID_TRANSLATION_ALT = `${this.ENDPOINT_APP_PROJECTS_ID_LINES_ID_TRANSLATION}/alt`;

  static ENDPOINT_APP_PROJECTS_ID_ANNOTATIONS_ALL = `${this.ENDPOINT_APP_PROJECTS_ID}/annotations/all`;
  static ENDPOINT_APP_PROJECTS_ID_INSPECTIONS_ALL = `${this.ENDPOINT_APP_PROJECTS_ID}/inspections/all`;

  static ENDPOINT_APP_MEDIA = `${this.ENDPOINT_APP}/media`;
  static ENDPOINT_APP_MEDIA_SONGS = `${this.ENDPOINT_APP_MEDIA}/songs`;

  static ENDPOINT_APP_MEDIA_SONGS_ID = `${this.ENDPOINT_APP_MEDIA_SONGS}/{song_id}`;

  static ENDPOINT_APP_MEDIA_SONGS_ID_VIDEO = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/video`;

  static ENDPOINT_APP_MEDIA_SONGS_ID_LINES_ID_VIDEO = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/lines/{line_id}/video`;

  static ENDPOINT_APP_MEDIA_SONGS_ID_COVER = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/cover_image`;
  static ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO = `${this.ENDPOINT_APP_MEDIA_SONGS_ID}/audio`;
  static ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO_SAMPLES = `${this.ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO}/samples`;

  static ENDPOINT_APP_PROJECTS_ID_LOGS_INSERT = `${this.ENDPOINT_APP_PROJECTS_ID}/logs/insert`;

  static ENDPOINT_APP_PROJECTS_ID_CHAT = `${this.ENDPOINT_APP_PROJECTS_ID}/chat`;
  static ENDPOINT_APP_PROJECTS_ID_CHAT_ALL = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT}/all`;

  static ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT}/threads`;

  static ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_START = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS}/start`;

  static ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS}/{thread_id}`;

  static ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID_MESSAGES = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID}/messages`;
  static ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID_MESSAGES_NEW = `${this.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID_MESSAGES}/new`;

  static ENDPOINT_ADMIN_AUTH = `${this.ENDPOINT_ADMIN}/auth`
  static ENDPOINT_ADMIN_AUTH_LOGIN = `${this.ENDPOINT_ADMIN_AUTH}/login`
  static ENDPOINT_ADMIN_AUTH_VERIFY = `${this.ENDPOINT_ADMIN_AUTH}/verify`

  static ENDPOINT_ADMIN_DATA = `${this.ENDPOINT_ADMIN}/data`
  static ENDPOINT_ADMIN_DATA_USERS = `${this.ENDPOINT_ADMIN_DATA}/users`
  static ENDPOINT_ADMIN_DATA_USERS_ALL = `${this.ENDPOINT_ADMIN_DATA_USERS}/all`

  static ENDPOINT_ADMIN_DATA_USERS_ID = `${this.ENDPOINT_ADMIN_DATA_USERS}/{user_id}`
  static ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS = `${this.ENDPOINT_ADMIN_DATA_USERS_ID}/projects`
  static ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID = `${this.ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS}/{project_id}`
  static ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID_INFO = `${this.ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID}/info`
  static ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID_LOGS = `${this.ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID}/logs`
  
  

  static getTemplateEndpoint(
    template: string,
    values: { [key: string]: string }
  ): string {
    return pupa(template, values);
  }

  private static _axiosInstance: Axios | undefined = undefined;

  static get axios(): Axios {
    if (this._axiosInstance == null) {
      this._axiosInstance = axios.create({
        baseURL: `http://${import.meta.env.VITE_BACKEND_HOSTNAME}:${
          import.meta.env.VITE_BACKEND_PORT
        }/api/v1`,
      });
    }
    console.log(this._axiosInstance.defaults.baseURL);
    return this._axiosInstance!;
  }

  static getSignedInHeaders(token: string): any {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  static async logInteraction(
    token: string,
    projectId: string,
    type: InteractionType,
    metadata?: any,
    timestamp?: number
  ): Promise<boolean> {
    try {
      console.log("Try logging interaction...", moment.tz.guess(true))
      await Http.axios.post(
        Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_LOGS_INSERT, {
          project_id: projectId,
        }),
        {
          type,
          metadata,
          timestamp,
          timezone: moment.tz.guess(true),
        },
        { headers: Http.getSignedInHeaders(token) }
      );
      console.log("Successfully logged interaction log.")
      return true;
    } catch (ex) {
      console.log(ex)
      return false;
    }
  }
}
