#!/bin/sh
npx prisma db push
npx next start -p 3000 -H 0.0.0.0