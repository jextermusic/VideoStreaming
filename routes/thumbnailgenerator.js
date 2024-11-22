const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

ffmpeg.setFfprobePath('C:/ffmpeg/bin/ffprobe');
ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg');

function generateThumbnail(videoPath, thumbnailPath, callback) {
    ffmpeg(videoPath)
      .seekInput('00:00:05')
      .screenshots({
        count: 1,
        folder: path.dirname(thumbnailPath),
        filename: path.basename(thumbnailPath),
      })
      .on('end', function () {
        console.log('Thumbnail generated successfully!');
        callback(null);
      })
      .on('error', function (err) {
        console.error('Error generating thumbnail:', err.message);
        callback(err);
      });
  }

module.exports = generateThumbnail;