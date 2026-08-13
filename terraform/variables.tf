variable "aws_region" {
  description = "Região AWS onde a infraestrutura conceitual seria criada."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nome curto do projeto, utilizado na nomenclatura e nas tags."
  type        = string
  default     = "loja-veloz"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name deve conter somente letras minúsculas, números e hífens."
  }
}

variable "environment" {
  description = "Ambiente representado pela infraestrutura."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "Bloco CIDR IPv4 da VPC."
  type        = string
  default     = "10.20.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr deve ser um bloco CIDR IPv4 válido."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDRs das duas subnets públicas, uma por zona de disponibilidade."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2 && alltrue([for cidr in var.public_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Informe exatamente dois CIDRs IPv4 válidos para as subnets públicas."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDRs das duas subnets privadas usadas pelos nodes do EKS."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2 && alltrue([for cidr in var.private_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Informe exatamente dois CIDRs IPv4 válidos para as subnets privadas."
  }
}

variable "kubernetes_version" {
  description = "Versão do Kubernetes suportada pelo EKS no momento do provisionamento."
  type        = string
  default     = "1.33"
}

variable "node_instance_types" {
  description = "Tipos de instância permitidos no node group gerenciado."
  type        = list(string)
  default     = ["t3.medium"]

  validation {
    condition     = length(var.node_instance_types) > 0
    error_message = "Informe ao menos um tipo de instância para os nodes."
  }
}

variable "node_desired_size" {
  description = "Quantidade desejada de nodes."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Quantidade mínima de nodes."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Quantidade máxima de nodes."
  type        = number
  default     = 4
}

variable "cluster_public_access_cidrs" {
  description = "CIDRs autorizados a acessar o endpoint público do EKS; restrinja antes de qualquer apply."
  type        = list(string)
  default     = ["203.0.113.10/32"]

  validation {
    condition     = length(var.cluster_public_access_cidrs) > 0 && alltrue([for cidr in var.cluster_public_access_cidrs : can(cidrnetmask(cidr))])
    error_message = "Informe ao menos um bloco CIDR IPv4 válido para acesso ao endpoint do cluster."
  }
}
