package br.com.rpm33.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Notificacao;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

  List<Notificacao> findByClienteIdOrderByIdDesc(Long clienteId);
}
