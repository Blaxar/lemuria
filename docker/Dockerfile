FROM ubuntu/nginx

RUN apt-get update -y
RUN apt-get install python3-pip git curl -y && cd /root && \
    git clone https://github.com/7185/lemuria.git && cd lemuria && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs && \
    npm install --legacy-peer-deps && pip3 install --user -r srv/requirements.txt

RUN cd /root/lemuria/srv/tools && ./import_lemuria.py

CMD ./start_lemuria.sh