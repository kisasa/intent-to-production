#!/bin/sh
# Provisions just enough ECS state in LocalStack for dispatch-worker's real
# ecs:RunTask/DescribeTasks calls to work locally — not the real
# infrastructure/ CDKTN stacks pointed at LocalStack, which would pull in
# ACM/Route53/load-balancer resources this loop never touches.
#
# LocalStack's Fargate emulation runs tasks as real local Docker containers
# (via the local Docker engine, which is why the localstack service itself
# mounts /var/run/docker.sock — not something dispatch-worker's own
# container needs). It still requires real (LocalStack-emulated) VPC/
# subnet/security-group resources to exist first — confirmed against
# LocalStack's own ECS/Fargate tutorial: placeholder ids are rejected.
#
# The cluster and task-definition ARNs are deterministic (LocalStack's
# account id is always 000000000000) and could be hardcoded, but the
# subnet/security-group ids AWS/LocalStack assigns are not — so this script
# writes everything to a shared file docker-compose.yml mounts into
# dispatch-worker's own environment via env_file, rather than requiring
# them to be copied by hand.
set -eu

ENDPOINT="${AWS_ENDPOINT_URL:-http://localstack:4566}"
REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="specialist-local"
TASK_FAMILY="specialist-local"
CONTAINER_NAME="specialist-local"
IMAGE="specialist-runner:local"
OUTPUT_FILE="${BOOTSTRAP_OUTPUT_FILE:-/bootstrap-output/localstack.env}"

aws_local() {
  aws --endpoint-url "$ENDPOINT" --region "$REGION" "$@"
}

echo "Creating a dummy VPC/subnet/security group..."
VPC_ID=$(aws_local ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
SUBNET_ID=$(aws_local ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 --query 'Subnet.SubnetId' --output text)
SECURITY_GROUP_ID=$(aws_local ec2 create-security-group \
  --group-name specialist-local-sg \
  --description "specialist-runner local dev" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)

echo "Creating the ECS cluster..."
aws_local ecs create-cluster --cluster-name "$CLUSTER_NAME" >/dev/null
CLUSTER_ARN="arn:aws:ecs:${REGION}:000000000000:cluster/${CLUSTER_NAME}"

echo "Registering the specialist-runner task definition..."
TASK_DEF_ARN=$(aws_local ecs register-task-definition \
  --family "$TASK_FAMILY" \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu 1024 --memory 2048 \
  --container-definitions "[{\"name\":\"${CONTAINER_NAME}\",\"image\":\"${IMAGE}\",\"essential\":true}]" \
  --query 'taskDefinition.taskDefinitionArn' --output text)

mkdir -p "$(dirname "$OUTPUT_FILE")"
cat > "$OUTPUT_FILE" <<EOF
SPECIALIST_CLUSTER_ARN=${CLUSTER_ARN}
SPECIALIST_TASK_DEFINITION_ARN=${TASK_DEF_ARN}
SPECIALIST_CONTAINER_NAME=${CONTAINER_NAME}
SPECIALIST_SECURITY_GROUP_ID=${SECURITY_GROUP_ID}
SPECIALIST_SUBNET_IDS=${SUBNET_ID}
EOF

echo "Bootstrap complete — wrote ${OUTPUT_FILE}:"
cat "$OUTPUT_FILE"
