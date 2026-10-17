{{- define "linkforge.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "linkforge.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "linkforge.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "linkforge.labels" -}}
helm.sh/chart: {{ include "linkforge.chart" . }}
{{ include "linkforge.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: api
app.kubernetes.io/part-of: linkforge
{{- end }}

{{- define "linkforge.selectorLabels" -}}
app.kubernetes.io/name: {{ include "linkforge.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "linkforge.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "linkforge.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "linkforge.validate" -}}
{{- if and (not .Values.database.external) (or .Values.autoscaling.enabled (gt (int .Values.replicaCount) 1)) }}
{{- fail "database.external must be true when replicaCount is greater than 1 or autoscaling is enabled. SQLite on an emptyDir is not shared across pods." }}
{{- end }}
{{- end }}
