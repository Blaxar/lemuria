cd /root/lemuria
npm run build

cd srv
python3 tools/serve_path.py &
python3 app.py &

# Wait for any process to exit
wait -n

# Exit with status of the first-exited process
exit $?
