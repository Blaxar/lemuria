# Lemuria

[![Build Status](https://app.travis-ci.com/7185/lemuria.svg?branch=master)](https://app.travis-ci.com/7185/lemuria)

Yet another project about creating a 3D virtual world and stuff.

Powered with Quart, Angular and Three.js.

## Installation

First we fetch all dependencies, for the moment it is still preferable to use the `--legacy-peer-deps` option to do so.

```bash
$ npm install --legacy-peer-deps
```

Then we build and run the project:

```bash
$ npm run build:watch
```

To avoid CORS issues when accessing static files from a web browser, go to `srv` and do the following:

```bash
$ tools/serve_path.py
```

This will run a script to serve files in `srv` on port `8181`

## First DB and server setup

Here you will find a few steps to follow in order to create and populate a working database for Lemuria.

### Install various python3 dependencies for the server

```bash
$ pip3 install --user -r srv/requirements.txt
```
### Create an empty database and import the json file

Go into `srv/tools`, then run the following:

```bash
$ ./import_lemuria.py
```

This will create and init the database `srv/app.db` using the data in `srv/atlemuria.txt` and `srv/proplemuria.txt`.

You will also need the `village2` resource path to be served, to do so you can go to `srv`
and create a symlink by running the following (but set the path correctly first):

```bash
$ ln -s /my/path/to/resource/folder/for/village2 village2
```

### Run the server

Go to `srv` and run the following:

```bash
$ python3 app.py
```

This will run the API backend, listening on port `8080`.

## Try it out!

Once `npm run`, `app.py` and `serve_path.py` are running: open your favorite web browser and go to `http://localhost:8080`,
you should be prompted with a login screen, put whatever nickname you want, the password you provide doesn't matter as
there's no proper authentication for the moment.
