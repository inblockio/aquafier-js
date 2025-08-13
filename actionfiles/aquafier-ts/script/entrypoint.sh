#!/bin/bash

#check if there is a backup
/app/utils/restore_backup.sh

exec "$@"