import {
    PayloadAction,
    createSelector,
    createSlice,
    current,
} from '@reduxjs/toolkit';
import { MediaPlayerStatus } from './types';
import { AppState, AppThunk } from '../../redux/store';
import { Howl, Howler, SoundSpriteDefinitions } from 'howler';
import { LyricLine, TimestampRange } from '../../model-types';
import { Http } from '../../net/http';
import {
    lineSelectors,
    selectLineIdsByVerseId,
    selectLinesByVerseId,
    verseSelectors,
} from '../signing/reducer';
import { BehaviorSubject, Observable, Subject, SubjectLike } from 'rxjs';

export interface MediaPlayerState {
    mountedSongId?: string | undefined;
    status: MediaPlayerStatus;
    songDurationMillis?: number;
    linePlayInfo: (TimestampRange & { lineId: string }) | undefined;
    hitLyricTokenIndex: number;
}

const INITIAL_STATE: MediaPlayerState = {
    mountedSongId: undefined,
    status: MediaPlayerStatus.Initial,
    linePlayInfo: undefined,
    songDurationMillis: undefined,
    hitLyricTokenIndex: -1,
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

        _setHitLyricTokenIndex: (state, action: PayloadAction<number>) => {
            state.hitLyricTokenIndex = action.payload;
        },

        _setSongDuration: (state, action: PayloadAction<number>) => {
            state.songDurationMillis = Math.ceil(action.payload * 1000)
        }
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

    export function getVolumeObservable(): Observable<number | null> {
        return volumeBehaviorSubject;
    }

    export function getTimestampObservable(): Observable<number | null> {
        return timestampBehaviorSubject;
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
                    console.log('Audio loaded - ', id, "duration - ", howl.duration());
                    volumeBehaviorSubject.next(howl.volume());
                    resolve(howl);
                },
                onloaderror: (id, error) => {
                    reject(error);
                },
                onstop: onStop,
                onplay: () => {
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

    export function mountSong(songId: string): AppThunk {
        return async (dispatch, getState) => {
            const state = getState();

            if (state.mediaPlayer.mountedSongId != songId) {
                lineHowl?.unload();
                lineHowl = undefined;

                dispatch(mediaPlayerSlice.actions._mountSong({id: songId}))

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

                    const onStop = () => {
                        timestampBehaviorSubject.next(null);
                    };

                    const onPlay = (howl: Howl) => {
                        dispatch(
                            mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing)
                        );

                        let animationFrameRef: number | null = null;

                        const onAnimationFrame = () => {
                            const timestamp = Math.round(howl.seek() * 1000);

                            if (howl.playing()) {
                                timestampBehaviorSubject.next(timestamp);

                                const verse = verseSelectors
                                    .selectAll(state)
                                    .find(
                                        (verse) =>
                                            verse.start_millis <= timestamp &&
                                            timestamp <= verse.end_millis
                                    );
                                if (verse != null) {
                                    const lines = selectLinesByVerseId(state, verse.id);
                                    const line = lines.find((line) => {
                                        return (
                                            line.start_millis <= timestamp &&
                                            timestamp <= line.end_millis
                                        );
                                    });
                                    if (line != null) {
                                        const tokenIndex = line.timestamps.findIndex(
                                            (ts) =>
                                                ts.start_millis <= timestamp &&
                                                timestamp <= ts.end_millis
                                        );
                                        dispatch(
                                            mediaPlayerSlice.actions._setHitLyricTokenIndex(
                                                tokenIndex
                                            )
                                        );
                                    } else {
                                        dispatch(
                                            mediaPlayerSlice.actions._setHitLyricTokenIndex(-1)
                                        );
                                    }
                                } else {
                                    dispatch(mediaPlayerSlice.actions._setHitLyricTokenIndex(-1));
                                }

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

                    sprites[songId] = [0, verses[verses.length - 1].end_millis, true];

                    lineHowl = await createHowl(
                        currentSongObjectURL,
                        lines.reduce((prev: { [key: string]: any }, line) => {
                            prev[line.id] = [
                                line.start_millis,
                                line.end_millis - line.start_millis,
                                true,
                            ];
                            return prev;
                        }, {}),
                        onStop,
                        onPlay,
                        onPause
                    );

                    dispatch(mediaPlayerSlice.actions._setSongDuration(lineHowl.duration()))

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

    export function playLineLoop(lineId: string): AppThunk {
        return async (dispatch, getState) => {
            const state = getState();
            const line = lineSelectors.selectById(state, lineId);

            let resumePosition: number | undefined = undefined;
            if (state.mediaPlayer.status == MediaPlayerStatus.Paused) {
                resumePosition = lineHowl?.seek();
            }

            Howler.stop();
            lineHowl?.play(lineId);
            if (resumePosition) {
                lineHowl?.seek(resumePosition);
            }

            dispatch(mediaPlayerSlice.actions._setStatus(MediaPlayerStatus.Playing));
            dispatch(
                mediaPlayerSlice.actions._enterLinePlayMode({
                    ...line,
                    lineId: line.id,
                })
            );
        };
    }

    export function pauseLineLoop(): AppThunk {
        return async (dispatch, getState) => {
            if (lineHowl?.playing() == true) {
                lineHowl?.pause();
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
