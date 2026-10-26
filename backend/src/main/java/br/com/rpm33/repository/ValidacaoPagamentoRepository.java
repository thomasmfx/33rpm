package br.com.rpm33.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.ValidacaoPagamento;

public interface ValidacaoPagamentoRepository extends JpaRepository<ValidacaoPagamento, Long> {

  List<ValidacaoPagamento> findByPedidoIdIn(Collection<Long> pedidoIds);
}
