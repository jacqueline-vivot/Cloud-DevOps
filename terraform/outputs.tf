output "cluster_name" {
  description = "Nome do cluster EKS."
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "Endpoint da API Kubernetes do EKS."
  value       = aws_eks_cluster.main.endpoint
}

output "aws_region" {
  description = "Região AWS selecionada."
  value       = var.aws_region
}

output "vpc_id" {
  description = "ID da VPC da Loja Veloz."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs das subnets públicas."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs das subnets privadas usadas pelo node group."
  value       = aws_subnet.private[*].id
}

output "node_group_name" {
  description = "Nome do node group gerenciado."
  value       = aws_eks_node_group.main.node_group_name
}

output "configure_kubectl_command" {
  description = "Comando de referência para configurar o kubectl após um provisionamento autorizado."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}

