import { useState } from 'react';
import { Button, TextField, MenuItem, Select, FormControl, InputLabel, LinearProgress, Typography } from '@mui/material';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp4');
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);

    // 1. Start the download process
    const startRes = await axios.post('http://localhost:8000/start-download', null, {
      params: { url, format }
    });
    const videoId = startRes.data.id;

    // 2. Poll progress
    let finished = false;
    while (!finished) {
      const res = await axios.get('http://localhost:8000/progress', { params: { id: videoId } });
      setProgress(res.data.progress);
      if (res.data.progress >= 1) {
        finished = true;
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 3. Download the file
    const response = await axios.get('http://localhost:8000/get-file', {
      params: { id: videoId },
      responseType: 'blob'
    });
    setDownloading(false);
    setProgress(0);

    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `download.${format}`;
    link.click();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)"
      }}
    >
      <div
        style={{
          width: 400,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(31, 41, 55, 0.15)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <Typography variant="h4" style={{ fontWeight: 700, marginBottom: 24, color: "#2563eb" }}>
          YouTube Downloader
        </Typography>
        <TextField
          fullWidth
          label="YouTube URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          style={{ marginBottom: 20 }}
        />
        <FormControl fullWidth style={{ marginBottom: 30 }}>
          <InputLabel>Format</InputLabel>
          <Select value={format} label="Format" onChange={e => setFormat(e.target.value)}>
            <MenuItem value="mp4">MP4</MenuItem>
            <MenuItem value="mp3">MP3</MenuItem>
          </Select>
        </FormControl>
        <Button
          onClick={handleDownload}
          variant="contained"
          style={{
            marginBottom: 24,
            background: "linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            padding: "10px 0"
          }}
          fullWidth
          disabled={downloading}
        >
          Download
        </Button>
        {downloading && (
          <div style={{ width: "100%", marginTop: 10 }}>
            <LinearProgress
              variant="determinate"
              value={progress * 100}
              sx={{
                height: 14,
                borderRadius: 7,
                backgroundColor: "#e0e7ff",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 7,
                  background: "linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)"
                }
              }}
            />
            <Typography
              align="center"
              style={{
                marginTop: 12,
                fontWeight: 700,
                fontSize: 20,
                color: "#2563eb",
                letterSpacing: 1
              }}
            >
              {Math.round(progress * 100)}%
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

