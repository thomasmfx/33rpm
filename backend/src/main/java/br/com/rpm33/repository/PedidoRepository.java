package br.com.rpm33.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

  List<Pedido> findByClienteIdOrderByDataCadastroDescIdDesc(Long clienteId);

  List<Pedido> findAllByOrderByDataCadastroDescIdDesc();
}
