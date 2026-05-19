#!/bin/bash
# Fix EACCES: permission denied, mkdir '.expo/web'
# @expo/image-utils needs this directory for icon caching during prebuild
mkdir -p .expo/web
chmod -R 777 .expo
