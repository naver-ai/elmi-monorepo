from backend.tasks.media_preparation.media import MediaManager

if __name__ == "__main__":
    MediaManager.retrieve_video_from_youtube("test_song_dir", "video.mp4", "gdZLi9oWNZg")
    