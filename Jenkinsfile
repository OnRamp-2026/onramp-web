pipeline {
  agent {
    kubernetes {
      defaultContainer 'tools'
      yaml """
apiVersion: v1
kind: Pod
spec:
  restartPolicy: Never
  containers:
    - name: tools
      image: node:20-alpine
      command:
        - cat
      tty: true
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command:
        - /busybox/cat
      tty: true
      volumeMounts:
        - name: kaniko-docker-config
          mountPath: /kaniko/.docker
  volumes:
    - name: kaniko-docker-config
      emptyDir: {}
"""
    }
  }

  options {
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  environment {
    IMAGE_REPOSITORY = 'amdp-registry.skala-ai.com/skala26a-cloud/onramp-web'
    GITOPS_REPOSITORY = 'https://github.com/OnRamp-2026/gitops.git'
    GITOPS_VALUES_FILES = 'apps/onramp-web/values-dev.yaml apps/onramp-web/values-tenant1.yaml'
  }

  stages {
    stage('Prepare Tools') {
      steps {
        sh '''
          set -eu
          apk add --no-cache git ca-certificates
        '''
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
        sh 'git config --global --add safe.directory "${WORKSPACE}"'
        script {
          env.IMAGE_TAG = sh(
            script: 'git rev-parse --short=12 HEAD',
            returnStdout: true
          ).trim()
        }
      }
    }

    stage('Lint, Type Check and Test') {
      steps {
        sh '''
          set -eu
          npm ci
          npx eslint .
          npm run typecheck
          npm test
        '''
      }
    }

    stage('Build Image Check') {
      when {
        changeRequest()
      }
      steps {
        container('kaniko') {
          sh '''
            set -eu
            /kaniko/executor \
              --context "${WORKSPACE}" \
              --dockerfile "${WORKSPACE}/Dockerfile" \
              --custom-platform=linux/amd64 \
              --build-arg VITE_AUTH_MOCK=false \
              --build-arg VITE_DEV_AUTH_TOKEN= \
              --destination "${IMAGE_REPOSITORY}:${IMAGE_TAG}" \
              --no-push
          '''
        }
      }
    }

    stage('Build and Push Image') {
      when {
        allOf {
          branch 'main'
          not {
            changeRequest()
          }
        }
      }
      steps {
        container('kaniko') {
          withCredentials([usernamePassword(
            credentialsId: 'harbor-robot-credential',
            usernameVariable: 'HARBOR_USERNAME',
            passwordVariable: 'HARBOR_PASSWORD'
          )]) {
            sh '''
              set -eu
              REGISTRY_HOST="${IMAGE_REPOSITORY%%/*}"
              AUTH="$(printf '%s:%s' "${HARBOR_USERNAME}" "${HARBOR_PASSWORD}" | base64 | tr -d '\\n')"
              cat > /kaniko/.docker/config.json <<EOF
{"auths":{"${REGISTRY_HOST}":{"auth":"${AUTH}"}}}
EOF
              /kaniko/executor \
                --context "${WORKSPACE}" \
                --dockerfile "${WORKSPACE}/Dockerfile" \
                --custom-platform=linux/amd64 \
                --build-arg VITE_AUTH_MOCK=false \
                --build-arg VITE_DEV_AUTH_TOKEN= \
                --destination "${IMAGE_REPOSITORY}:${IMAGE_TAG}" \
                --digest-file "${WORKSPACE}/image-digest.txt"
            '''
          }
        }
        script {
          env.IMAGE_DIGEST = readFile('image-digest.txt').trim()
          env.FULL_IMAGE = "${env.IMAGE_REPOSITORY}@${env.IMAGE_DIGEST}"
          echo "Built image: ${env.FULL_IMAGE}"
        }
      }
    }

    stage('Update GitOps Image Digest') {
      when {
        allOf {
          branch 'main'
          not {
            changeRequest()
          }
        }
      }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'github-gitops-write-token',
          usernameVariable: 'GITOPS_USERNAME',
          passwordVariable: 'GITOPS_TOKEN'
        )]) {
          sh '''
            set -eu

            rm -rf gitops

            ENCODED_GITOPS_USERNAME="$(node -e 'process.stdout.write(encodeURIComponent(process.env.GITOPS_USERNAME))')"
            ENCODED_GITOPS_TOKEN="$(node -e 'process.stdout.write(encodeURIComponent(process.env.GITOPS_TOKEN))')"
            AUTHED_REPO="$(printf '%s' "${GITOPS_REPOSITORY}" | sed "s#https://#https://${ENCODED_GITOPS_USERNAME}:${ENCODED_GITOPS_TOKEN}@#")"

            git clone "${AUTHED_REPO}" gitops

            cd gitops
            git config user.name "onramp-jenkins"
            git config user.email "onramp-jenkins@users.noreply.github.com"

            node - <<'JS'
const fs = require('fs');

const paths = process.env.GITOPS_VALUES_FILES.split(/\\s+/).filter(Boolean);
const replacements = {
  'repository:': process.env.IMAGE_REPOSITORY,
  'tag:': process.env.IMAGE_TAG,
  'digest:': process.env.IMAGE_DIGEST,
};

for (const path of paths) {
  const updatedLines = fs.readFileSync(path, 'utf8').split('\\n').map((line) => {
    const stripped = line.replace(/^ +/, '');
    const indent = line.slice(0, line.length - stripped.length);

    for (const [key, value] of Object.entries(replacements)) {
      if (stripped.startsWith(key)) {
        return `${indent}${key} ${value}`;
      }
    }
    return line;
  });

  fs.writeFileSync(path, updatedLines.join('\\n'));
}
JS

            git diff -- ${GITOPS_VALUES_FILES}

            if git diff --quiet -- ${GITOPS_VALUES_FILES}; then
              echo "No GitOps image digest change."
              exit 0
            fi

            git add ${GITOPS_VALUES_FILES}
            git commit -m "chore: update onramp-web image ${IMAGE_TAG} [skip ci]"
            git push origin main
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'rm -rf node_modules gitops image-digest.txt || true'
    }
  }
}
