#!/bin/bash

# AWS SSL Investigation Script
# This script investigates existing AWS resources to find SSL termination options

set -e

# Configuration
REGION="us-east-1"
DOMAIN="homework.metacto.com"
EC2_IP="34.228.58.5"

echo "=== AWS SSL Infrastructure Investigation ==="
echo "Domain: $DOMAIN"
echo "EC2 IP: $EC2_IP"
echo ""

# Check if AWS CLI is available
AWS_CLI="$AWS_CLI"
if command -v ~/.local/bin/$AWS_CLI &> /dev/null; then
    AWS_CLI="~/.local/bin/$AWS_CLI"
elif ! command -v $AWS_CLI &> /dev/null; then
    echo "ERROR: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get instance details
echo "1. Getting EC2 Instance Details..."
INSTANCE_ID=$($AWS_CLI ec2 describe-instances \
    --filters "Name=ip-address,Values=$EC2_IP" \
    --region $REGION \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$INSTANCE_ID" != "NOT_FOUND" ] && [ "$INSTANCE_ID" != "None" ]; then
    echo "   Instance ID: $INSTANCE_ID"
    
    VPC_ID=$($AWS_CLI ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].VpcId' \
        --output text)
    echo "   VPC ID: $VPC_ID"
    
    SECURITY_GROUPS=$($AWS_CLI ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
        --output text)
    echo "   Security Groups: $SECURITY_GROUPS"
else
    echo "   ERROR: Could not find instance with IP $EC2_IP"
fi

echo ""

# Check Route 53
echo "2. Checking Route 53 Records..."
HOSTED_ZONES=$($AWS_CLI route53 list-hosted-zones --query 'HostedZones[*].[Id,Name]' --output text)
while IFS=$'\t' read -r zone_id zone_name; do
    if [[ "$zone_name" == "metacto.com." ]]; then
        echo "   Found hosted zone: $zone_name (ID: $zone_id)"
        
        # Get records for homework.metacto.com
        RECORDS=$($AWS_CLI route53 list-resource-record-sets \
            --hosted-zone-id $zone_id \
            --query "ResourceRecordSets[?Name=='$DOMAIN.']" \
            --output json)
        
        if [ "$RECORDS" != "[]" ]; then
            echo "   Found Route 53 record for $DOMAIN:"
            echo "$RECORDS" | jq -r '.[] | "   Type: \(.Type), Value: \(.ResourceRecords[0].Value // .AliasTarget.DNSName)"'
        fi
    fi
done <<< "$HOSTED_ZONES"

echo ""

# Check ACM Certificates
echo "3. Checking ACM Certificates..."
CERTS=$($AWS_CLI acm list-certificates \
    --region $REGION \
    --query 'CertificateSummaryList[*].[CertificateArn,DomainName]' \
    --output text)

while IFS=$'\t' read -r cert_arn domain; do
    if [[ "$domain" == "*.metacto.com" ]] || [[ "$domain" == "metacto.com" ]]; then
        echo "   Found certificate: $domain"
        echo "   ARN: $cert_arn"
        
        # Get certificate details
        CERT_STATUS=$($AWS_CLI acm describe-certificate \
            --certificate-arn $cert_arn \
            --region $REGION \
            --query 'Certificate.Status' \
            --output text)
        echo "   Status: $CERT_STATUS"
        
        # Check if certificate is in use
        IN_USE=$($AWS_CLI acm describe-certificate \
            --certificate-arn $cert_arn \
            --region $REGION \
            --query 'Certificate.InUseBy' \
            --output json)
        if [ "$IN_USE" != "[]" ]; then
            echo "   In use by:"
            echo "$IN_USE" | jq -r '.[] | "     - \(.)"'
        fi
    fi
done <<< "$CERTS"

echo ""

# Check Application Load Balancers
echo "4. Checking Application Load Balancers..."
ALBS=$($AWS_CLI elbv2 describe-load-balancers \
    --region $REGION \
    --query 'LoadBalancers[*].[LoadBalancerArn,DNSName,LoadBalancerName]' \
    --output text)

if [ -n "$ALBS" ]; then
    while IFS=$'\t' read -r alb_arn dns_name alb_name; do
        echo "   ALB: $alb_name"
        echo "   DNS: $dns_name"
        
        # Check listeners for HTTPS
        HTTPS_LISTENERS=$($AWS_CLI elbv2 describe-listeners \
            --load-balancer-arn $alb_arn \
            --region $REGION \
            --query 'Listeners[?Protocol==`HTTPS`].[ListenerArn,Certificates[0].CertificateArn]' \
            --output text)
        
        if [ -n "$HTTPS_LISTENERS" ]; then
            echo "   HTTPS Listeners with certificates:"
            echo "$HTTPS_LISTENERS" | while read listener cert; do
                echo "     - Certificate: $cert"
            done
        fi
        
        # Check target groups
        TARGET_GROUPS=$($AWS_CLI elbv2 describe-target-groups \
            --load-balancer-arn $alb_arn \
            --region $REGION \
            --query 'TargetGroups[*].[TargetGroupArn,TargetGroupName]' \
            --output text 2>/dev/null || true)
        
        if [ -n "$TARGET_GROUPS" ]; then
            echo "   Target Groups:"
            echo "$TARGET_GROUPS" | while read tg_arn tg_name; do
                echo "     - $tg_name"
                # Check if our instance is registered
                if [ "$INSTANCE_ID" != "NOT_FOUND" ]; then
                    REGISTERED=$($AWS_CLI elbv2 describe-target-health \
                        --target-group-arn $tg_arn \
                        --region $REGION \
                        --query "TargetHealthDescriptions[?Target.Id=='$INSTANCE_ID'].Target.Id" \
                        --output text 2>/dev/null || true)
                    if [ -n "$REGISTERED" ]; then
                        echo "       * Our EC2 instance is registered in this target group!"
                    fi
                fi
            done
        fi
        echo ""
    done <<< "$ALBS"
else
    echo "   No ALBs found"
fi

echo ""

# Check CloudFront Distributions
echo "5. Checking CloudFront Distributions..."
DISTRIBUTIONS=$($AWS_CLI cloudfront list-distributions \
    --query 'DistributionList.Items[*].[Id,DomainName,Aliases.Items[0]]' \
    --output text 2>/dev/null || true)

if [ -n "$DISTRIBUTIONS" ]; then
    while IFS=$'\t' read -r dist_id cf_domain alias; do
        if [[ "$alias" == *"metacto.com"* ]]; then
            echo "   Distribution ID: $dist_id"
            echo "   CloudFront Domain: $cf_domain"
            echo "   Alias: $alias"
            
            # Get origin details
            ORIGIN=$($AWS_CLI cloudfront get-distribution \
                --id $dist_id \
                --query 'Distribution.DistributionConfig.Origins.Items[0].[DomainName,OriginPath]' \
                --output text)
            echo "   Origin: $ORIGIN"
        fi
    done <<< "$DISTRIBUTIONS"
else
    echo "   No relevant CloudFront distributions found"
fi

echo ""

# Check Security Group Rules
if [ -n "$SECURITY_GROUPS" ]; then
    echo "6. Checking Security Group Rules for EC2 Instance..."
    for sg in $SECURITY_GROUPS; do
        echo "   Security Group: $sg"
        
        # Inbound rules
        RULES=$($AWS_CLI ec2 describe-security-groups \
            --group-ids $sg \
            --region $REGION \
            --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp,UserIdGroupPairs[0].GroupId]' \
            --output text)
        
        echo "   Inbound Rules:"
        echo "$RULES" | while IFS=$'\t' read -r protocol from_port to_port cidr source_sg; do
            if [ "$from_port" == "80" ] || [ "$from_port" == "443" ]; then
                if [ -n "$cidr" ] && [ "$cidr" != "None" ]; then
                    echo "     - Port $from_port from CIDR: $cidr"
                elif [ -n "$source_sg" ] && [ "$source_sg" != "None" ]; then
                    echo "     - Port $from_port from Security Group: $source_sg"
                fi
            fi
        done
    done
fi

echo ""
echo "=== Summary and Recommendations ==="
echo ""
echo "Based on the investigation above, here are the findings:"
echo ""
echo "1. Your EC2 instance ($INSTANCE_ID) is running at IP $EC2_IP"
echo "2. Route 53 should have a record for $DOMAIN pointing to an SSL termination service"
echo "3. The wildcard certificate *.metacto.com should be attached to an ALB or CloudFront"
echo "4. That service should forward traffic to your EC2 instance on port 80"
echo ""
echo "Next steps will depend on what we found above."