from os import getcwd, path, makedirs


class ElmiConfig:
    DIR_DATA = path.join(getcwd(), "../../data")
    DIR_SONGS = path.join(DIR_DATA, "songs")
    
    @classmethod
    def get_song_dir(cls, song_id: str)->str:
        dir_path = path.join(cls.DIR_SONGS, song_id)
        if not path.exists(dir_path):
            makedirs(dir_path)
        return dir_path
    
    @classmethod
    def get_song_cover_filepath(cls, song_id: str) -> str:
        return path.join(cls.get_song_dir(song_id), "cover.jpg")