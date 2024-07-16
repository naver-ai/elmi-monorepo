import { PayloadAction, createSlice, current } from '@reduxjs/toolkit';
import { MediaPlayerStatus } from './types';
import { AppThunk } from '../../redux/store';
import { Howl, Howler, SoundSpriteDefinitions } from 'howler';
import { LyricLine, TimestampRange } from '../../model-types';
import { Http } from '../../net/http';
import { lineSelectors } from '../signing/reducer';

export interface MediaPlayerState {
  mountedSongId?: string | undefined;
  status: MediaPlayerStatus;
  linePlayInfo: TimestampRange & {lineId: string} | undefined
}

const INITIAL_STATE: MediaPlayerState = {
  mountedSongId: undefined,
  status: MediaPlayerStatus.Initial,
  linePlayInfo: undefined
};

const mediaPlayerSlice = createSlice({
  name: 'media_player',
  initialState: INITIAL_STATE,
  reducers: {
    _initialize: (state) => {
      return INITIAL_STATE;
    },

    _mountSong: (
      state,
      action: PayloadAction<{
        id: string
      }>
    ) => {
      state.mountedSongId = action.payload.id
      state.status = MediaPlayerStatus.Initial;
    },

    _setStatus: (state, action: PayloadAction<MediaPlayerStatus>) => {
      state.status = action.payload;
    },

    _enterLinePlayMode: (state, action: PayloadAction<TimestampRange & {lineId: string}>) => {
        state.linePlayInfo = action.payload
    },

    _exitLinePlayMode: (state) => {
        state.linePlayInfo = undefined
    }
  },
});

export default mediaPlayerSlice.reducer;

export namespace MediaPlayer {
  let lineHowl: Howl | undefined = undefined;
  let wholeHowl: Howl | undefined = undefined;

  async function createHowl(src:string, sprite?: SoundSpriteDefinitions | undefined): Promise<Howl> {
    return new Promise((resolve, reject) => {
        const howl = new Howl({
            src,
            sprite,
            format: 'mp3',
            onload: (id) => {
              console.log('Audio loaded - ', id);
              resolve(howl)
            },
            onloaderror: (id, error) => {
              reject(error)
            },
          });
    })
  }

  export function mountSong(songId: string, lines: Array<LyricLine>): AppThunk {
    return async (dispatch, getState) => {
      const state = getState();
      lineHowl?.unload();

      dispatch(
        mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.LoadingMedia)
      );

      try {
        const resp = await Http.axios.get(
          Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO, {
            song_id: songId,
          }),
          {
            headers: await Http.getSignedInHeaders(state.auth.token!),
            responseType: 'blob',
          }
        );

        const currentSongObjectURL = URL.createObjectURL(resp.data);

        [lineHowl, wholeHowl] = await Promise.all([createHowl(currentSongObjectURL, lines.reduce((prev: { [key: string]: any }, line) => {
            prev[line.id] = [
              line.start_millis,
              line.end_millis - line.start_millis,
              true,
            ];
            return prev;
          }, {})), createHowl(currentSongObjectURL)])
          dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Standby))

      } catch (ex) {
        console.log(ex);
        dispatch(
          mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Initial)
        );
      }
    };
  }

  export function playLineLoop(lineId: string): AppThunk {
    return async (dispatch, getState) => {
       Howler.stop();
       lineHowl?.play(lineId);

       const state = getState()
       const line = lineSelectors.selectById(state, lineId)
        
       dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing))
       dispatch(mediaPlayerSlice.actions._enterLinePlayMode({...line, lineId: line.id}))
    };
  }

  export function stopAllMedia(): AppThunk {
    return async (dispatch, getState) => {
      Howler.stop();
      dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Standby));
    };
  }


  export function dispose(): AppThunk {
    return async (dispatch, getState) => {
      Howler.stop();
      lineHowl?.unload()
      wholeHowl?.unload()
      dispatch(mediaPlayerSlice.actions._initialize());
    };
  }
}
