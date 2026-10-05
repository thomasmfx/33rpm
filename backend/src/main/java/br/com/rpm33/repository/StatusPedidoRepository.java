package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.StatusPedido;

public interface StatusPedidoRepository extends JpaRepository<StatusPedido, Long> {

  Optional<StatusPedido> findByDescricao(String descricao);
}
