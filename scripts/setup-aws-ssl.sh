#!/bin/bash

# AWS SSL Setup Script for Homework Tracker
# This script sets up ALB with existing *.metacto.com wildcard certificate

set -e

# Configuration
REGION="us-east-1"
AWS_CLI="$HOME/.local/bin/aws"
INSTANCE_ID=$(ssh -o StrictHostKeyChecking=no -i ~/.ssh/metacto-aws-lbargmann.pem ec2-user@ec2-34-228-58-5.compute-1.amazonaws.com "ec2-metadata --instance-id | cut -d ' ' -f 2")
VPC_ID=$($AWS_CLI ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].VpcId' --output text)
SUBNET_ID=$($AWS_CLI ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].SubnetId' --output text)
AVAILABILITY_ZONE=$($AWS_CLI ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)

echo "Instance ID: $INSTANCE_ID"
echo "VPC ID: $VPC_ID"
echo "Subnet ID: $SUBNET_ID"
echo "Availability Zone: $AVAILABILITY_ZONE"

# Step 1: Use existing wildcard certificate
echo "Step 1: Using existing *.metacto.com wildcard certificate..."
CERTIFICATE_ARN="arn:aws:acm:us-east-1:339712698650:certificate/773d82c4-b315-40f4-986c-77d444903c84"
echo "Certificate ARN: $CERTIFICATE_ARN"

# Step 2: Get available subnets in different AZs (ALB requires at least 2)
echo "Step 2: Getting available subnets..."
SUBNETS=$($AWS_CLI ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --region $REGION \
    --query 'Subnets[?State==`available`].[SubnetId,AvailabilityZone]' \
    --output text)

SUBNET_1=$(echo "$SUBNETS" | head -n1 | awk '{print $1}')
SUBNET_2=$(echo "$SUBNETS" | tail -n1 | awk '{print $1}')

echo "Using subnets: $SUBNET_1, $SUBNET_2"

# Step 3: Create Security Group for ALB
echo "Step 3: Creating Security Group for ALB..."
SG_ID=$($AWS_CLI ec2 create-security-group \
    --group-name homework-tracker-alb-sg \
    --description "Security group for Homework Tracker ALB" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --query 'GroupId' \
    --output text)

$AWS_CLI ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION

$AWS_CLI ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION

echo "Security Group ID: $SG_ID"

# Step 4: Create Target Group
echo "Step 4: Creating Target Group..."
TG_ARN=$($AWS_CLI elbv2 create-target-group \
    --name homework-tracker-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --target-type instance \
    --health-check-path / \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

echo "Target Group ARN: $TG_ARN"

# Register EC2 instance with target group
$AWS_CLI elbv2 register-targets \
    --target-group-arn $TG_ARN \
    --targets Id=$INSTANCE_ID,Port=80 \
    --region $REGION

# Step 5: Create Application Load Balancer
echo "Step 5: Creating Application Load Balancer..."
ALB_ARN=$($AWS_CLI elbv2 create-load-balancer \
    --name homework-tracker-alb \
    --subnets $SUBNET_1 $SUBNET_2 \
    --security-groups $SG_ID \
    --scheme internet-facing \
    --type application \
    --region $REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$($AWS_CLI elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "ALB ARN: $ALB_ARN"
echo "ALB DNS: $ALB_DNS"

# Step 6: Create HTTPS Listener
echo "Step 6: Creating HTTPS Listener..."
$AWS_CLI elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERTIFICATE_ARN \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $REGION

# Step 7: Create HTTP to HTTPS redirect
echo "Step 7: Creating HTTP to HTTPS redirect..."
$AWS_CLI elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
    --region $REGION

# Step 8: Update EC2 Security Group to allow traffic from ALB
echo "Step 8: Updating EC2 Security Group..."
EC2_SG_ID=$($AWS_CLI ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
    --output text)

$AWS_CLI ec2 authorize-security-group-ingress \
    --group-id $EC2_SG_ID \
    --protocol tcp \
    --port 80 \
    --source-group $SG_ID \
    --region $REGION

echo "Setup complete!"
echo "ALB DNS Name: $ALB_DNS"
echo ""
echo "Next steps:"
echo "1. Update Route 53 record for homework.metacto.com to point to: $ALB_DNS"
echo "2. Wait a few minutes for ALB to become active"
echo "3. Test https://homework.metacto.com"
echo ""
echo "The ALB is configured to use the existing *.metacto.com wildcard certificate"
echo "and will forward traffic to your EC2 instance on port 80."