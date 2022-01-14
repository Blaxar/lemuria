[Unit]
Description=Workaround to serve static web browser files on Lemuria without triggering CORS issues

[Service]
ExecStart=/bin/bash -c 'cd /root/lemuria/srv && python3 tools/serve_path.py'
