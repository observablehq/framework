#!/usr/bin/env bash
set -eu

PIZZA_PARADISE_URL="https://static.observableusercontent.com/files/c653108ab176088cacbb338eaf2344c4f5781681702bd6afb55697a3f91b511c6686ff469f3e3a27c75400001a2334dbd39a4499fe46b50a8b3c278b7d2f7fb5"

if [[ ! -f "src/.observablehq/cache/pizza.csv" ]]; then
  echo "Downloading Pizza Paradise dataset"
  mkdir -p "src/.observablehq/cache"
  curl -s $PIZZA_PARADISE_URL | gunzip > "./src/.observablehq/cache/pizza.csv"
fi
