FROM ubuntu/nginx

RUN apt-get update -y
RUN apt-get install python3-pip npm git -y && cd /root && \
    git clone https://github.com/7185/lemuria.git && cd lemuria && \
    npm install --legacy-peer-deps && pip3 install --user -r srv/requirements.txt

RUN cd /home/root/srv/tools && ./import_lemuria.py

CMD ./start_lemuria.sh