# AI 求职辅助平台部署运维手册

> **版本**: v1.0
> **创建日期**: 2026-02-15
> **运维团队**: DevOps

---

## 目录

- [1. 部署架构概述](#1-部署架构概述)
- [2. 基础设施配置](#2-基础设施配置)
- [3. CI/CD 流程](#3-cicd-流程)
- [4. 容器化方案](#4-容器化方案)
- [5. 监控告警](#5-监控告警)
- [6. 备份与恢复](#6-备份与恢复)
- [7. 故障排查手册](#7-故障排查手册)
- [8. 运维脚本](#8-运维脚本)

---

## 1. 部署架构概述

### 1.1 环境划分

```
┌─────────────────────────────────────────────────────────────────┐
│                           生产环境                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    阿里云 K8s 集群                          │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│  │  │ Web Pod │ │ API Pod │ │ Worker  │ │ CronJob │         │ │
│  │  │ (Next.js)│ │(NestJS)│ │  Pod    │ │         │         │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘         │ │
│  │       │            │           │                          │ │
│  │  ┌────▼────────────▼───────────▼────────────────────┐     │ │
│  │  │            服务网格 (Istio)                       │     │ │
│  │  └──────────────────────────────────────────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────────────────┼─────────────────────────────┐  │
│  │  ▼                        ▼                        ▼     │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │  │
│  │ │ SLB  │ │  RDS │ │ Redis│ │  OSS │ │  ACK │ │ SLS  │ │  │
│  │ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                           预发环境                              │
│                      (配置与生产相同)                            │
│                      数据量较小，定期重置                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                           开发环境                              │
│                    本地 Docker Compose                          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 资源清单

| 环境 | K8s 集群 | 实例规格 | 数量 | 备注 |
|------|---------|---------|------|------|
| 生产 | 阿里云 ACK | 4C8G | 6 | 3可用区 |
| 预发 | 阿里云 ACK | 2C4G | 2 | 单可用区 |
| 开发 | 本地 | - | - | Docker Compose |

---

## 2. 基础设施配置

### 2.1 阿里云资源配置

```yaml
# terraform/main.tf
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

resource "alicloud_cs_managed_kubernetes" "main" {
  name               = "ai-job-assistant-prod"
  worker_vswitch_ids = var.vswitch_ids
  worker_instance_types = ["ecs.c6.xlarge"]

  # 节点配置
  worker_numbers         = 3
  worker_disk_category   = "cloud_essd"
  worker_disk_size       = 100

  # 网络配置
  pod_vswitch_ids     = var.vswitch_ids
  service_cidr        = "172.21.0.0/20"

  # 附加组件
  addons {
    name = "terway-eniip"
  }
  addons {
    name = "csi-plugin"
  }
  addons {
    name = "csi-provisioner"
  }
  addons {
    name = "logtail-ds"
  }
}

resource "alicloud_slb_load_balancer" "api" {
  specification       = "slb.s3.medium"
  vswitch_id          = var.vswitch_ids[0]
  load_balancer_name  = "api-lb"
  address_type        = "internet"
  load_balancer_spec  = "slb.s3.medium"
}

resource "alicloud_db_instance" "main" {
  engine               = "PostgreSQL"
  engine_version       = "15.0"
  instance_type        = "pg.n4.2c.2m"
  instance_storage     = 100
  instance_charge_type = "Postpaid"
  vswitch_id           = var.vswitch_ids[0]

  # 备份
  backup_retention_policy = 7

  # 高可用
  ha_config = {
    enabled = true
  }
}

resource "alicloud_kvstore_instance" "redis" {
  instance_name  = "redis-cluster"
  instance_class = "redis.master.small.default"
  instance_type  = "Redis"
  engine_version = "7.0"
  vswitch_id     = var.vswitch_ids[0]

  # 集群模式
  architecture_type = "cluster"
  shard_count       = 3
}
```

### 2.2 网络配置

```yaml
# terraform/network.tf
resource "alicloud_vpc" "main" {
  vpc_name   = "ai-job-assistant-vpc"
  cidr_block = "10.0.0.0/16"
}

resource "alicloud_vswitch" "zones" {
  count     = 3
  vpc_id    = alicloud_vpc.main.id
  cidr_block = "10.0.${count.index}.0/24"
  zone_id   = data.alicloud_zones.available.zones[count.index].id
}

# 安全组规则
resource "alicloud_security_group_rule" "allow_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  port_range        = "80/80"
  security_group_id = alicloud_security_group.main.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "allow_https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  port_range        = "443/443"
  security_group_id = alicloud_security_group.main.id
  cidr_ip           = "0.0.0.0/0"
}
```

### 2.3 DNS 配置

```yaml
# 阿里云 DNS 配置
resource "alicloud_dns_record" "api" {
  name        = "api"
  host_record = "api"
  type        = "A"
  value       = alicloud_slb_load_balancer.api.address
}

resource "alicloud_dns_record" "www" {
  name        = "www"
  host_record = "@"
  type        = "CNAME"
  value       = alicloud_slb_load_balancer.api.address
}
```

---

## 3. CI/CD 流程

### 3.1 GitHub Actions 工作流

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: registry.cn-hangzhou.aliyuncs.com
  PROJECT: ai-job-assistant

jobs:
  build-and-push:
    name: Build & Push Images
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Aliyun Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ALIYUN_USERNAME }}
          password: ${{ secrets.ALIYUN_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.PROJECT }}/${{ github.event.repository.name }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./docker/Dockerfile.prod
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api-deploy \
            api=${{ needs.build-and-push.outputs.image-tag }} \
            -n staging

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/api-deploy -n staging --timeout=5m

  deploy-production:
    name: Deploy to Production
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_PROD }}

      - name: Run database migrations
        run: |
          kubectl exec -n prod deployment/api-deploy -- npm run migration:deploy

      - name: Deploy to Kubernetes (Canary)
        run: |
          # 金丝雀发布：先部署 10% 流量
          kubectl apply -f k8s/production/canary.yaml

      - name: Wait for canary
        run: |
          kubectl wait --for=condition=available --timeout=5m \
            deployment/api-deploy-canary -n prod

      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env=production

      - name: Full rollout
        if: success()
        run: |
          # 测试通过，全量发布
          kubectl apply -f k8s/production/
          kubectl delete -f k8s/production/canary.yaml

      - name: Rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/api-deploy -n prod
```

### 3.2 灰度发布策略

```yaml
# k8s/production/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-canary
  namespace: prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deploy
  service:
    port: 3000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
  webhooks:
  - name: smoke-test
    url: https://webhook.site/smoke-test
    timeout: 5s
    metadata:
      type: "before-route"
```

---

## 4. 容器化方案

### 4.1 Dockerfile

```dockerfile
# docker/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建
RUN npm run build

# 生产镜像
FROM node:20-alpine

# 安装 dumb-init
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# 切换用户
USER nodejs

# 使用 dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 4.2 Kubernetes 部署清单

```yaml
# k8s/production/deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    name: production
    env: prod

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: prod
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: prod
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/prod"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "${JWT_SECRET}"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deploy
  namespace: prod
  labels:
    app: api
    env: prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        env: prod
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: api-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: api
        image: registry.cn-hangzhou.aliyuncs.com/ai-job-assistant/api:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: api-svc
  namespace: prod
  labels:
    app: api
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: api

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deploy
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

---

## 5. 监控告警

### 5.1 Prometheus 配置

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

scrape_configs:
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
    - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
      action: keep
      regex: default;kubernetes;https

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
    - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
    - action: labelmap
      regex: __meta_kubernetes_node_label_(.+)

  - job_name: 'api-server'
    kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
        - prod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      regex: api
      action: keep
    - source_labels: [__meta_kubernetes_pod_ip]
      target_label: __address__
      replacement: $1:3000
    metrics_path: /metrics
```

### 5.2 告警规则

```yaml
# prometheus/alerts/api.yml
groups:
- name: api_alerts
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
      /
      sum(rate(http_requests_total[5m])) by (service)
      > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.service }}"
      description: "Error rate is {{ $value | humanizePercentage }} (threshold: 1%)"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
      ) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency on {{ $labels.service }}"
      description: "P95 latency is {{ $value }}s (threshold: 1s)"

  - alert: HighCPUUsage
    expr: |
      sum(rate(container_cpu_usage_seconds_total{container="api"}[5m])) by (pod)
      /
      sum(container_spec_cpu_quota{container="api"} / container_spec_cpu_period{container="api"}) by (pod)
      > 0.8
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage on {{ $labels.pod }}"
      description: "CPU usage is {{ $value | humanizePercentage }} (threshold: 80%)"

  - alert: HighMemoryUsage
    expr: |
      sum(container_memory_working_set_bytes{container="api"}) by (pod)
      /
      sum(container_spec_memory_limit_bytes{container="api"}) by (pod)
      > 0.85
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on {{ $labels.pod }}"
      description: "Memory usage is {{ $value | humanizePercentage }} (threshold: 85%)"

  - alert: PodCrashLooping
    expr: |
      rate(kube_pod_container_status_restarts_total{container="api"}[15m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pod {{ $labels.pod }} is crash looping"
      description: "Pod has restarted {{ $value }} times in the last 15 minutes"

  - alert: DatabaseConnectionPoolExhausted
    expr: |
      pg_stat_activity_count{datname="prod"} / pg_settings_max_connections > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool almost exhausted"
      description: "{{ $value | humanizePercentage }} of connections used"

  - alert: RedisMemoryHigh
    expr: |
      redis_memory_used_bytes / redis_memory_max_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Redis memory usage high"
      description: "{{ $value | humanizePercentage }} of memory used"
```

### 5.3 Grafana 仪表板

```json
{
  "dashboard": {
    "title": "API 服务监控",
    "panels": [
      {
        "title": "请求 QPS",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"api\"}[1m]))"
          }
        ]
      },
      {
        "title": "错误率",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{service=\"api\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"api\"}[5m]))"
          }
        ]
      },
      {
        "title": "P95 延迟",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service=\"api\"}[5m])) by (le))"
          }
        ]
      },
      {
        "title": "活跃连接数",
        "targets": [
          {
            "expr": "http_active_connections{service=\"api\"}"
          }
        ]
      }
    ]
  }
}
```

---

## 6. 备份与恢复

### 6.1 数据库备份策略

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 全量备份
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/backup_$DATE.dump"

# 上传到 OSS
ossutil cp "$BACKUP_DIR/backup_$DATE.dump" \
  "oss://ai-job-assistant-backups/postgres/backup_$DATE.dump"

# 清理旧备份
find "$BACKUP_DIR" -name "backup_*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.dump"
```

### 6.2 恢复流程

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# 下载备份
ossutil cp "$BACKUP_FILE" "/tmp/restore.dump"

# 停止应用
kubectl scale deployment/api-deploy --replicas=0 -n prod

# 恢复数据库
pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists \
  "/tmp/restore.dump"

# 重启应用
kubectl scale deployment/api-deploy --replicas=3 -n prod

echo "Restore completed"
```

### 6.3 备份策略

| 数据类型 | 备份方式 | 频率 | 保留期 |
|---------|---------|------|--------|
| PostgreSQL | 全量 + WAL | 每日 + 实时 | 30天 |
| Redis | RDB + AOF | 每小时 + 实时 | 7天 |
| OSS | 版本控制 | 自动 | 90天 |
| 代码 | Git | 每次 push | 永久 |

---

## 7. 故障排查手册

### 7.1 常见问题

#### 问题：Pod 无法启动

```bash
# 查看 Pod 状态
kubectl get pods -n prod

# 查看 Pod 详情
kubectl describe pod <pod-name> -n prod

# 查看日志
kubectl logs <pod-name> -n prod

# 常见原因
# 1. 镜像拉取失败 -> 检查 imagePullSecrets
# 2. 资源不足 -> 检查 nodes 资源
# 3. ConfigMap/Secret 缺失 -> 检查配置
```

#### 问题：数据库连接失败

```bash
# 测试连接
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql $DATABASE_URL

# 检查连接数
kubectl exec -it postgres-0 -n prod -- \
  psql -c "SELECT count(*) FROM pg_stat_activity;"

# 检查慢查询
kubectl exec -it postgres-0 -n prod -- \
  psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

#### 问题：高延迟

```bash
# 查看资源使用
kubectl top pods -n prod

# 查看数据库性能
kubectl exec -it postgres-0 -n prod -- \
  psql -c "SELECT * FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# 查看缓存命中率
kubectl exec -it redis-0 -n prod -- redis-cli INFO stats
```

### 7.2 应急预案

#### 场景：API 服务不可用

```bash
# 1. 检查服务状态
kubectl get pods -n prod -l app=api

# 2. 查看事件
kubectl get events -n prod --sort-by='.lastTimestamp'

# 3. 扩容（如果资源充足）
kubectl scale deployment/api-deploy --replicas=6 -n prod

# 4. 回滚（如果是新版本问题）
kubectl rollout undo deployment/api-deploy -n prod

# 5. 启用维护模式（如果需要）
kubectl apply -f k8s/maintenance-mode.yaml
```

#### 场景：数据库主库故障

```bash
# 1. 检查主库状态
kubectl exec -it postgres-0 -n prod -- pg_isready

# 2. 手动切换到备库（如果自动切换失败）
kubectl exec -it postgres-1 -n prod -- \
  psql -c "SELECT pg_promote();"

# 3. 更新应用配置
kubectl set env deployment/api-deploy \
  --containers=api \
  --env="DATABASE_URL=postgresql://..." \
  -n prod
```

---

## 8. 运维脚本

### 8.1 部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENV=${1:-staging}
VERSION=${2:-latest}

echo "Deploying $VERSION to $ENV..."

# 构建镜像
docker build -t registry.cn-hangzhou.aliyuncs.com/ai-job-assistant/api:$VERSION .

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/ai-job-assistant/api:$VERSION

# 更新 K8s
kubectl set image deployment/api-deploy \
  api=registry.cn-hangzhou.aliyuncs.com/ai-job-assistant/api:$VERSION \
  -n $ENV

# 等待就绪
kubectl rollout status deployment/api-deploy -n $ENV --timeout=5m

echo "Deploy completed!"
```

### 8.2 监控脚本

```bash
#!/bin/bash
# scripts/monitor.sh

NAMESPACE=${1:-prod}

while true; do
  clear
  echo "=== Pod Status ==="
  kubectl get pods -n $NAMESPACE

  echo -e "\n=== Resource Usage ==="
  kubectl top pods -n $NAMESPACE

  echo -e "\n=== Recent Events ==="
  kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10

  sleep 10
done
```

### 8.3 日志查询脚本

```bash
#!/bin/bash
# scripts/logs.sh

NAMESPACE=${1:-prod}
SERVICE=${2:-api}
SINCE=${3:-1h}

kubectl logs -n $NAMESPACE -l app=$SERVICE --since=$SINCE \
  --tail=100 -f --timestamps=true
```

---

## 附录

### A. 环境变量清单

```env
# .env.production
NODE_ENV=production
PORT=3000

# 数据库
DATABASE_URL=postgresql://user:pass@postgres:5432/prod
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_PREFIX=prod

# JWT
JWT_SECRET=changeme
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# AI 服务
OPENAI_API_KEY=sk-xxx
OPENAI_ORG=org-xxx

# OSS
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET=ai-job-assistant-prod
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx

# 监控
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### B. 常用命令

```bash
# 查看集群状态
kubectl cluster-info
kubectl get nodes

# 查看资源
kubectl get all -n prod
kubectl top nodes
kubectl top pods -n prod

# 调试
kubectl exec -it <pod-name> -n prod -- /bin/sh
kubectl port-forward <pod-name> 3000:3000 -n prod

# 日志
kubectl logs -f <pod-name> -n prod
kubectl logs -f deployment/api-deploy -n prod

# 扩缩容
kubectl scale deployment/api-deploy --replicas=5 -n prod
kubectl autoscale deployment/api-deploy --min=3 --max=10 --cpu-percent=70 -n prod
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-15
**维护者**: DevOps 团队
