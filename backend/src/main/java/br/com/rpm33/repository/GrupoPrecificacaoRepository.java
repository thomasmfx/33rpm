package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.GrupoPrecificacao;

public interface GrupoPrecificacaoRepository extends JpaRepository<GrupoPrecificacao, Long> {

  Optional<GrupoPrecificacao> findByNomeIgnoreCase(String nome);
}
