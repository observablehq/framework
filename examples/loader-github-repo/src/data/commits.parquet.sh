set -a; source .env; set +a

CLONE=repos/$GITHUB_REPOS

if [ -d "$CLONE" ]; then
  echo "using cached clone $CLONE" >&2
else
  echo "cloning $GITHUB_REPOS into $CLONE" >&2
  git clone "https://github.com/${GITHUB_REPOS}.git" "$CLONE/"
fi

cd "$CLONE/"

TMP="../$(basename $CLONE)-commits.csv"

if [ ! -f "$TMP" ]; then

git log --pretty=format:'%x00%h%x00,%x00%an%x00,%x00%cI%x00' --shortstat \
  | sed 's/"/""/g' | tr '\00' '"' \
  | awk -F, '
BEGIN {
  OFS = ",";
  comm = "hash,author,date"; files = "files"; insertions = "insertions"; deletions = "deletions";
}

/^"/ {
  print comm, files, insertions, deletions;
  comm = $0;
  files = ""
  insertions = "";
  deletions = "";
}

/ files? changed/ {
  if (match($0, /([0-9]+) file/)) files = substr($0, RSTART, RLENGTH - 5);
  if (match($0, /([0-9]+) insertion/)) insertions = substr($0, RSTART, RLENGTH - 10);
  if (match($0, /([0-9]+) deletion/)) deletions = substr($0, RSTART, RLENGTH - 9);
}

END {
  print comm, files, insertions, deletions;
}
' > $TMP;

fi

duckdb -c "
  COPY (FROM '$TMP' ORDER BY author, date)
  TO STDOUT (format parquet, compression zstd)
"
