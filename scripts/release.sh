#!/bin/bash

set -e

git checkout -b releases/$1
git push -u origin releases/$1
git checkout master
