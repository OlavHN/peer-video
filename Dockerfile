# Docker config for peer-video service

# Get base OS
FROM ubuntu
RUN echo "deb http://archive.ubuntu.com/ubuntu precise universe" >> /etc/apt/sources.list
RUN apt-get update

MAINTAINER olav@comoyo.com

# Node.js
RUN apt-get install python-software-properties python g++ make -y
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install nodejs -y

# ssh server
RUN apt-get install openssh-server -y

# Git
RUN apt-get install git-core -y

# Get repo
RUN git clone git@github.com:OlavHN/peer-video peer-video
RUN cd peer-video; npm install

#Start server
ENV PORT 8000
EXPOSE 8000
CMD ["node", "peer-video/server.js"]
