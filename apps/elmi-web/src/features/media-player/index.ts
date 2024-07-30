import {
  PayloadAction,
  createSelector,
  createSlice,
  current,
} from '@reduxjs/toolkit';
import { MediaPlayerStatus } from './types';
import { AppDispatch, AppState, AppThunk } from '../../redux/store';
import { Howl, Howler, SoundSpriteDefinitions } from 'howler';
import { LyricLine, TimestampRange } from '../../model-types';
import { Http } from '../../net/http';
import {
  lineSelectors,
  selectLineIdsByVerseId,
  selectLinesByVerseId,
  setDetailLineId,
  verseSelectors,
} from '../signing/reducer';
import { BehaviorSubject, Observable, Subject, SubjectLike } from 'rxjs';

export interface LyricTokenCoord {
  verseId: string;
  lineId?: string;
  index?: number;
}

export interface MediaPlayerState {
  mountedSongId?: string | undefined;
  status: MediaPlayerStatus;
  songDurationMillis?: number;
  linePlayInfo: (TimestampRange & { lineId: string }) | undefined;
  hitLyricTokenInfo: LyricTokenCoord | undefined;
  songSamples?: Array<number>;
}

const INITIAL_STATE: MediaPlayerState = {
  mountedSongId: undefined,
  status: MediaPlayerStatus.Initial,
  linePlayInfo: undefined,
  songDurationMillis: undefined,
  hitLyricTokenInfo: undefined,
  songSamples: undefined,
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
        id: string;
      }>
    ) => {
      state.mountedSongId = action.payload.id;
      state.status = MediaPlayerStatus.Initial;
    },

    _setStatus: (state, action: PayloadAction<MediaPlayerStatus>) => {
      state.status = action.payload;
    },

    _enterLinePlayMode: (
      state,
      action: PayloadAction<TimestampRange & { lineId: string }>
    ) => {
      state.linePlayInfo = action.payload;
    },

    _exitLinePlayMode: (state) => {
      state.linePlayInfo = undefined;
    },

    _setHitLyricTokenInfo: (
      state,
      action: PayloadAction<
        { verseId: string; lineId?: string; index?: number } | undefined
      >
    ) => {
      state.hitLyricTokenInfo = action.payload;
    },

    _setSongDuration: (state, action: PayloadAction<number>) => {
      state.songDurationMillis = Math.ceil(action.payload * 1000);
    },

    _setSongSamples: (state, action: PayloadAction<Array<number>>) => {
      state.songSamples = action.payload;
    },
  },
});

export default mediaPlayerSlice.reducer;

export const mountedLindIdSelector = createSelector(
  [(state: AppState) => state.mediaPlayer.linePlayInfo],
  (playInfo) => playInfo?.lineId
);

export namespace MediaPlayer {
  let lineHowl: Howl | undefined = undefined;

  const volumeBehaviorSubject = new BehaviorSubject<number | null>(null);
  const timestampBehaviorSubject = new BehaviorSubject<number | null>(null);
  const timelineClickEventSubject = new Subject<{ positionMillis: number, lyricCoord?: LyricTokenCoord }>();

  export function getVolumeObservable(): Observable<number | null> {
    return volumeBehaviorSubject;
  }

  export function getTimestampObservable(): Observable<number | null> {
    return timestampBehaviorSubject;
  }

  export function getCurrentTimestampMillis(): number | null {
    return timestampBehaviorSubject.value
  }

  export function getTimelineClickEventObservable(): Observable<{
    positionMillis: number;
    lyricCoord?: LyricTokenCoord;
  }> {
    return timelineClickEventSubject;
  }

  export function setMediaVolume(volume: number) {
    lineHowl?.volume(volume);
  }

  async function createHowl(
    src: string,
    sprite?: SoundSpriteDefinitions | undefined,
    onStop?: () => void,
    onPlay?: (howl: Howl) => void,
    onPause?: (howl: Howl) => void
  ): Promise<Howl> {
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src,
        sprite,
        format: 'mp3',
        onload: (id) => {
          console.log('Audio loaded - ', id, 'duration - ', howl.duration());
          volumeBehaviorSubject.next(howl.volume());
          resolve(howl);
        },
        onloaderror: (id, error) => {
          reject(error);
        },
        onstop: onStop,
        onplay: (id) => {
          onPlay?.(howl);
        },
        onpause: () => {
          onPause?.(howl);
        },
        onvolume: () => {
          volumeBehaviorSubject.next(howl.volume());
        },
      });
    });
  }

  function dispatchSongPosition(dispatch: any, state: AppState, positionMillis: number) {
    if(timestampBehaviorSubject.value != positionMillis) {
      timestampBehaviorSubject.next(positionMillis);
      dispatch(mediaPlayerSlice.actions._setHitLyricTokenInfo(calcLyricTokenCoord(state, positionMillis)))
    }
  }

  function calcLyricTokenCoord(
    state: AppState,
    positionMillis: number
  ): LyricTokenCoord | undefined {
    const verse = verseSelectors
      .selectAll(state)
      .find(
        (verse) =>
          verse.start_millis <= positionMillis &&
          positionMillis <= verse.end_millis
      );
    if (verse != null) {
      const lines = selectLinesByVerseId(state, verse.id);
      const line = lines.find((line) => {
        return (
          line.start_millis <= positionMillis &&
          positionMillis <= line.end_millis
        );
      });
      if (line != null) {
        const tokenIndex = line.timestamps.findIndex(
          (ts) =>
            ts.start_millis <= positionMillis && positionMillis <= ts.end_millis
        );
        return {
          verseId: verse.id,
          lineId: line.id,
          index: tokenIndex,
        };
      } else
        return {
          verseId: verse.id,
        };
    } else return undefined;
  }

  export function mountSong(songId: string): AppThunk {
    return async (dispatch, getState) => {
      const state = getState();

      if (state.mediaPlayer.mountedSongId != songId) {
        lineHowl?.unload();
        lineHowl = undefined;

        dispatch(mediaPlayerSlice.actions._mountSong({ id: songId }));

        dispatch(
          mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.LoadingMedia)
        );

        try {
          const resp = await Http.axios.get(
            Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO, {
              song_id: songId,
            }),
            {
              headers: Http.getSignedInHeaders(state.auth.token!),
              responseType: 'blob',
            }
          );

          const currentSongObjectURL = URL.createObjectURL(resp.data);

          const onStop = () => {
            //timestampBehaviorSubject.next(null);
          };

          const onPlay = (howl: Howl) => {
            dispatch(
              mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing)
            );

            let animationFrameRef: number | null = null;

            const onAnimationFrame = () => {
              
              if (howl.playing()) {
                const timestamp = Math.round(howl.seek() * 1000);
                if (timestamp > howl.duration() * 1000) {
                  howl.seek(verses[0].start_millis / 1000);
                }

                dispatchSongPosition(dispatch, state, timestamp)

                animationFrameRef = requestAnimationFrame(onAnimationFrame);
              } else {
                if (animationFrameRef) {
                  cancelAnimationFrame(animationFrameRef);
                }
              }
            };
            animationFrameRef = requestAnimationFrame(onAnimationFrame);
          };

          const onPause = (howl: Howl) => {
            dispatch(
              mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Paused)
            );
          };

          const lines = lineSelectors.selectAll(state);
          const verses = verseSelectors.selectAll(state);

          const sprites = lines.reduce((prev: { [key: string]: any }, line) => {
            prev[line.id] = [
              line.start_millis,
              line.end_millis - line.start_millis,
              true,
            ];
            return prev;
          }, {});

          sprites[songId] = [
            verses[0].start_millis,
            verses[verses.length - 1].end_millis,
            true,
          ];

          lineHowl = await createHowl(
            currentSongObjectURL,
            sprites,
            onStop,
            onPlay,
            onPause
          );

          dispatch(
            mediaPlayerSlice.actions._setSongDuration(lineHowl.duration())
          );

          try {
            const resp = await Http.axios.get(
              Http.getTemplateEndpoint(
                Http.ENDPOINT_APP_MEDIA_SONGS_ID_AUDIO_SAMPLES,
                { song_id: songId }
              ),
              {
                headers: Http.getSignedInHeaders(state.auth.token!),
              }
            );
            const samples: Array<number> = resp.data;
            dispatch(mediaPlayerSlice.actions._setSongSamples(samples));
          } catch (ex) {
            console.log(ex);
          }

          dispatch(
            mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Standby)
          );
        } catch (ex) {
          console.log(ex);
          dispatch(
            mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Initial)
          );
        }
      }
    };
  }

  export function dispatchTimelineClickEvent(positionMillis: number): AppThunk {
    return async (dispatch, getState) => {
      const lyricCoord = calcLyricTokenCoord(getState(), positionMillis)
      timelineClickEventSubject.next({ positionMillis, lyricCoord })
    };
  }

  export function playLineLoop(
    lineId: string,
    forcePlay: boolean = false
  ): AppThunk {
    return (dispatch, getState) => {
      const state = getState();
      const line = lineSelectors.selectById(state, lineId);

      const prevLineId = state.mediaPlayer.linePlayInfo?.lineId

      dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing));
      dispatch(
        mediaPlayerSlice.actions._enterLinePlayMode({
          ...line,
          lineId: line.id,
        })
      );

      let resumePosition: number | undefined = undefined;
      if (prevLineId == lineId) {
        if (state.mediaPlayer.status == MediaPlayerStatus.Paused) {
          resumePosition = lineHowl!.seek() * 1000;
        }
      }

      Howler.stop();
      if (state.mediaPlayer.status == MediaPlayerStatus.Paused || state.mediaPlayer.status == MediaPlayerStatus.Standby) {
        dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Standby));
        const position = resumePosition != null ? resumePosition : line.start_millis
        dispatchSongPosition(dispatch, state, position)
        if (forcePlay === true) {
          lineHowl?.play(lineId)
        }
        lineHowl?.seek(position/1000);
      } else {
        lineHowl?.play(lineId);
      }
    };
  }

  export function directAccessLineLoop(
    positionMillis: number,
    select: boolean
  ): AppThunk {
    return async (dispatch, getState) => {
      const state = getState();
      const lines = lineSelectors.selectAll(state);
      const line = lines.find(
        (line) =>
          line.start_millis <= positionMillis &&
          positionMillis <= line.end_millis
      );
      if (line != null) {
        playLineLoop(line.id, false)(dispatch, getState, null);
        if (select === true) {
          dispatch(setDetailLineId(line.id));
        }
      }
    };
  }

  export function exitLineLoop(): AppThunk {
    return async (dispatch, getState) => {
      const state = getState();
      if (state.mediaPlayer.linePlayInfo != null) {
        dispatch(mediaPlayerSlice.actions._exitLinePlayMode());
        const position = lineHowl?.seek();
        if (lineHowl?.playing()) {
          Howler.stop();
          lineHowl?.play(state.editor.song?.id!);
          lineHowl?.seek(position || 0);
        }
      }
    };
  }

  export function pauseMedia(): AppThunk {
    return async (dispatch, getState) => {
      if (lineHowl?.playing() == true) {
        lineHowl?.pause();
      }
    };
  }

  export function performGlobalPlay(): AppThunk {
    return async (dispatch, getState) => {
      if (lineHowl?.playing() == false) {
        const state = getState();
        const isInLineLoopMode = state.mediaPlayer.linePlayInfo;
        if (isInLineLoopMode) {
          await playLineLoop(state.mediaPlayer.linePlayInfo!.lineId, true)(
            dispatch,
            getState,
            null
          );
        } else {
          const resumePosition = timestampBehaviorSubject.getValue();

          Howler.stop();
          lineHowl?.play(state.editor.song?.id);

          if (resumePosition) {
            lineHowl?.seek(resumePosition / 1000);
          } else {
            lineHowl?.seek(
              verseSelectors.selectAll(state)[0].start_millis / 1000
            );
          }

          dispatch(
            mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing)
          );
        }
      }
    };
  }

  export function seekGlobalMediaPosition(positionMillis: number): AppThunk {
    return async (dispatch, getState) => {
      const state = getState();
      const isInLineLoopMode = state.mediaPlayer.linePlayInfo;
      if (!isInLineLoopMode && lineHowl != null) {
        lineHowl?.seek(positionMillis / 1000);
        const timestamp = Math.round(lineHowl.seek() * 1000);
        dispatchSongPosition(dispatch, state, timestamp)
      }
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
      lineHowl?.unload();
      lineHowl = undefined;
      dispatch(mediaPlayerSlice.actions._initialize());
    };
  }
}
