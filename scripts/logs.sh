#!/bin/bash

# View container logs
# Usage: ./logs.sh [options]

SERVER="ec2-34-228-58-5.compute-1.amazonaws.com"
IDENTITY_FILE="~/.ssh/metacto-aws-lbargmann.pem"
USER="ec2-user"
LINES=50
FOLLOW=false

show_help() {
    echo "View Homework Tracker container logs"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -s, --server      Server hostname (default: $SERVER)"
    echo "  -i, --identity    SSH identity file (default: $IDENTITY_FILE)"
    echo "  -u, --user        SSH user (default: $USER)"
    echo "  -n, --lines       Number of lines to show (default: $LINES)"
    echo "  -f, --follow      Follow log output"
    echo "  -h, --help        Show this help message"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--server)
            SERVER="$2"
            shift 2
            ;;
        -i|--identity)
            IDENTITY_FILE="$2"
            shift 2
            ;;
        -u|--user)
            USER="$2"
            shift 2
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Expand tilde in identity file path
IDENTITY_FILE="${IDENTITY_FILE/#\~/$HOME}"

echo "🔍 Viewing logs from $SERVER..."
echo "📄 Showing last $LINES lines"

if [ "$FOLLOW" = true ]; then
    echo "👀 Following logs (Ctrl+C to exit)"
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail $LINES -f"
else
    ssh -o StrictHostKeyChecking=no -i "$IDENTITY_FILE" "$USER@$SERVER" "docker logs homework-tracker --tail $LINES"
fi